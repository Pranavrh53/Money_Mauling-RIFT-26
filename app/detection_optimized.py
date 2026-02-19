"""
OPTIMIZED Money Muling Fraud Detection Engine
Performance target: 10K transactions in under 30 seconds

Key optimizations:
1. Limited DFS for cycle detection (instead of nx.simple_cycles)
2. Vectorized pandas operations (no iterrows)
3. Precomputed indexes and mappings
4. Early termination and pruning
5. Numpy-based calculations
"""
import networkx as nx
import pandas as pd
import numpy as np
from typing import Dict, List, Set, Tuple, Any, Optional
from collections import defaultdict
import logging
from datetime import timedelta
import time

logger = logging.getLogger(__name__)


class FraudDetectionEngine:
    """
    High-performance fraud detection using graph analysis.
    Optimized for 10K+ transactions in under 30 seconds.
    """
    
    def __init__(self, graph: nx.DiGraph, transactions_df: pd.DataFrame):
        self.graph = graph
        self.df = transactions_df
        
        # Results
        self.detected_cycles = []
        self.detected_fanin = []
        self.detected_fanout = []
        self.detected_chains = []
        self.suspicious_accounts = {}
        self.fraud_rings = []
        
        # Precompute for performance
        self._precompute_optimized()
    
    def _precompute_optimized(self):
        """Precompute all metrics using vectorized operations."""
        start = time.time()
        
        # Degree maps (fast)
        self.in_degree = dict(self.graph.in_degree())
        self.out_degree = dict(self.graph.out_degree())
        self.total_degree = {
            n: self.in_degree.get(n, 0) + self.out_degree.get(n, 0)
            for n in self.graph.nodes()
        }
        
        # Adjacency for fast lookup
        self.successors = {n: set(self.graph.successors(n)) for n in self.graph.nodes()}
        self.predecessors = {n: set(self.graph.predecessors(n)) for n in self.graph.nodes()}
        
        # Vectorized transaction counts
        sender_counts = self.df['sender_id'].value_counts()
        receiver_counts = self.df['receiver_id'].value_counts()
        all_accounts = set(self.df['sender_id']) | set(self.df['receiver_id'])
        self.transaction_counts = {
            acc: sender_counts.get(acc, 0) + receiver_counts.get(acc, 0)
            for acc in all_accounts
        }
        
        # Sort once
        self.df_sorted = self.df.sort_values('timestamp').reset_index(drop=True)
        
        # Pre-index by sender and receiver (vectorized groupby)
        self.sender_idx = self.df_sorted.groupby('sender_id').apply(
            lambda x: x.index.tolist()
        ).to_dict()
        self.receiver_idx = self.df_sorted.groupby('receiver_id').apply(
            lambda x: x.index.tolist()
        ).to_dict()
        
        # Timestamp as numpy array for fast operations
        self.timestamps = self.df_sorted['timestamp'].values
        self.amounts = self.df_sorted['amount'].values
        self.senders = self.df_sorted['sender_id'].values
        self.receivers = self.df_sorted['receiver_id'].values
        
        logger.info(f"Precomputation done in {time.time()-start:.3f}s")
    
    def detect_cycles(self, min_length: int = 3, max_length: int = 5, max_cycles: int = 100) -> List[List[str]]:
        """
        Optimized cycle detection using limited DFS.
        Uses early termination and visited set pruning.
        """
        start = time.time()
        logger.info(f"Detecting cycles (length {min_length}-{max_length})...")
        
        detected = []
        visited_cycles = set()  # Deduplicate cycles
        
        # Only search from nodes with both in and out edges (potential cycle members)
        candidates = [n for n in self.graph.nodes() 
                     if self.in_degree.get(n, 0) > 0 and self.out_degree.get(n, 0) > 0]
        
        for start_node in candidates:
            if len(detected) >= max_cycles:
                break
            
            # Limited DFS
            stack = [(start_node, [start_node], {start_node})]
            
            while stack and len(detected) < max_cycles:
                current, path, visited = stack.pop()
                
                if len(path) > max_length:
                    continue
                
                for neighbor in self.successors.get(current, []):
                    # Found cycle back to start
                    if neighbor == start_node and len(path) >= min_length:
                        cycle = tuple(sorted(path))  # Canonical form
                        if cycle not in visited_cycles:
                            visited_cycles.add(cycle)
                            detected.append(path.copy())
                    
                    # Extend path
                    elif neighbor not in visited and len(path) < max_length:
                        new_visited = visited | {neighbor}
                        stack.append((neighbor, path + [neighbor], new_visited))
        
        self.detected_cycles = detected
        logger.info(f"Found {len(detected)} cycles in {time.time()-start:.3f}s")
        return detected
    
    def detect_smurfing_patterns(self, threshold: int = 10, time_window_hours: int = 72) -> Dict[str, List[Dict]]:
        """
        Optimized smurfing detection using numpy arrays.
        Vectorized time window checks.
        """
        start = time.time()
        logger.info(f"Detecting smurfing (threshold={threshold})...")
        
        time_window_ns = np.timedelta64(time_window_hours, 'h')
        fan_in_patterns = []
        fan_out_patterns = []
        
        # Fan-in: check receivers with high in-degree
        high_indegree = [r for r, d in self.in_degree.items() if d >= threshold]
        
        for receiver in high_indegree:
            if receiver not in self.receiver_idx:
                continue
            
            indices = self.receiver_idx[receiver]
            if len(indices) < threshold:
                continue
            
            # Get timestamps and senders for this receiver
            ts = self.timestamps[indices]
            senders = self.senders[indices]
            amounts = self.amounts[indices]
            
            # Sliding window using numpy
            for i in range(len(ts)):
                window_mask = (ts >= ts[i]) & (ts <= ts[i] + time_window_ns)
                if window_mask.sum() >= threshold:
                    unique_senders = set(senders[window_mask])
                    if len(unique_senders) >= threshold:
                        fan_in_patterns.append({
                            'receiver': receiver,
                            'senders': list(unique_senders),
                            'count': len(unique_senders),
                            'total_amount': float(amounts[window_mask].sum())
                        })
                        break  # One per receiver
        
        # Fan-out: check senders with high out-degree
        high_outdegree = [s for s, d in self.out_degree.items() if d >= threshold]
        
        for sender in high_outdegree:
            if sender not in self.sender_idx:
                continue
            
            indices = self.sender_idx[sender]
            if len(indices) < threshold:
                continue
            
            ts = self.timestamps[indices]
            receivers = self.receivers[indices]
            amounts = self.amounts[indices]
            
            for i in range(len(ts)):
                window_mask = (ts >= ts[i]) & (ts <= ts[i] + time_window_ns)
                if window_mask.sum() >= threshold:
                    unique_receivers = set(receivers[window_mask])
                    if len(unique_receivers) >= threshold:
                        fan_out_patterns.append({
                            'sender': sender,
                            'receivers': list(unique_receivers),
                            'count': len(unique_receivers),
                            'total_amount': float(amounts[window_mask].sum())
                        })
                        break
        
        self.detected_fanin = fan_in_patterns
        self.detected_fanout = fan_out_patterns
        
        logger.info(f"Found {len(fan_in_patterns)} fan-in, {len(fan_out_patterns)} fan-out in {time.time()-start:.3f}s")
        return {'fan_in': fan_in_patterns, 'fan_out': fan_out_patterns}
    
    def detect_shell_chains(self, min_length: int = 3, max_degree: int = 3, max_chains: int = 50) -> List[List[str]]:
        """
        Optimized shell chain detection with aggressive pruning.
        """
        start = time.time()
        logger.info(f"Detecting shell chains...")
        
        detected_chains = []
        
        # Find potential shell accounts (low degree)
        shell_candidates = {n for n, d in self.total_degree.items() if 2 <= d <= max_degree}
        
        # Find starting points (nodes that send to shells)
        start_nodes = set()
        for shell in shell_candidates:
            for pred in self.predecessors.get(shell, []):
                if self.total_degree.get(pred, 0) > max_degree:
                    start_nodes.add(pred)
        
        # Limited BFS from each start
        for start_node in start_nodes:
            if len(detected_chains) >= max_chains:
                break
            
            # BFS with depth limit
            queue = [(start_node, [start_node])]
            visited_paths = set()
            
            while queue and len(detected_chains) < max_chains:
                current, path = queue.pop(0)
                
                if len(path) >= min_length + 3:  # Max depth
                    continue
                
                for neighbor in self.successors.get(current, []):
                    if neighbor in path:
                        continue
                    
                    new_path = path + [neighbor]
                    path_key = tuple(new_path)
                    
                    if path_key in visited_paths:
                        continue
                    visited_paths.add(path_key)
                    
                    # Check if valid shell chain
                    if len(new_path) >= min_length:
                        # Intermediates must be low degree
                        intermediates = new_path[1:-1]
                        if all(self.total_degree.get(n, 0) <= max_degree for n in intermediates):
                            detected_chains.append(new_path)
                            continue  # Don't extend further
                    
                    # Only continue if neighbor could be intermediate
                    if self.total_degree.get(neighbor, 0) <= max_degree + 1:
                        queue.append((neighbor, new_path))
        
        # Deduplicate (remove subchains)
        unique_chains = []
        chain_sets = [set(c) for c in detected_chains]
        for i, chain in enumerate(detected_chains):
            is_subchain = False
            for j, other_set in enumerate(chain_sets):
                if i != j and set(chain).issubset(other_set) and len(chain) < len(detected_chains[j]):
                    is_subchain = True
                    break
            if not is_subchain:
                unique_chains.append(chain)
        
        self.detected_chains = unique_chains[:max_chains]
        logger.info(f"Found {len(self.detected_chains)} chains in {time.time()-start:.3f}s")
        return self.detected_chains
    
    def calculate_suspicion_scores(self) -> Dict[str, Dict]:
        """
        Optimized scoring using batch operations.
        """
        start = time.time()
        logger.info("Calculating scores...")
        
        scores = defaultdict(lambda: {'score': 0, 'factors': [], 'patterns': [], 'risk_level': 'LOW'})
        
        # Cycle membership (+40)
        for cycle in self.detected_cycles:
            for acc in cycle:
                if 'cycle' not in scores[acc]['patterns']:
                    scores[acc]['score'] += 40
                    scores[acc]['factors'].append('cycle_member')
                    scores[acc]['patterns'].append('cycle')
        
        # Fan-in hub (+30)
        for pattern in self.detected_fanin:
            acc = pattern['receiver']
            if 'fan_in' not in scores[acc]['patterns']:
                scores[acc]['score'] += 30
                scores[acc]['factors'].append('fan_in_hub')
                scores[acc]['patterns'].append('fan_in')
        
        # Fan-out hub (+30)
        for pattern in self.detected_fanout:
            acc = pattern['sender']
            if 'fan_out' not in scores[acc]['patterns']:
                scores[acc]['score'] += 30
                scores[acc]['factors'].append('fan_out_hub')
                scores[acc]['patterns'].append('fan_out')
        
        # Shell intermediate (+20)
        for chain in self.detected_chains:
            for acc in chain[1:-1]:  # Intermediates only
                if 'shell_chain' not in scores[acc]['patterns']:
                    scores[acc]['score'] += 20
                    scores[acc]['factors'].append('shell_intermediate')
                    scores[acc]['patterns'].append('shell_chain')
        
        # Velocity multiplier - vectorized
        if len(scores) > 0:
            # Group transactions by account
            for acc in list(scores.keys()):
                sender_mask = self.senders == acc
                receiver_mask = self.receivers == acc
                acc_mask = sender_mask | receiver_mask
                
                if acc_mask.sum() > 1:
                    acc_ts = self.timestamps[acc_mask]
                    acc_ts_sorted = np.sort(acc_ts)
                    diffs = np.diff(acc_ts_sorted).astype('timedelta64[h]').astype(int)
                    rapid_count = np.sum(diffs < 24)
                    
                    if rapid_count >= 2:
                        multiplier = 1 + (rapid_count * 0.1)
                        scores[acc]['score'] *= min(multiplier, 2.0)  # Cap at 2x
                        scores[acc]['factors'].append(f'velocity_x{multiplier:.1f}')
        
        # Apply penalties for legitimate patterns
        for acc in list(scores.keys()):
            sender_mask = self.senders == acc
            receiver_mask = self.receivers == acc
            acc_mask = sender_mask | receiver_mask
            
            if acc_mask.sum() > 0:
                acc_ts = self.timestamps[acc_mask]
                if len(acc_ts) > 0:
                    time_span = (acc_ts.max() - acc_ts.min()).astype('timedelta64[D]').astype(int)
                    if time_span > 7 and acc_mask.sum() < 20:
                        scores[acc]['score'] *= 0.7
                        scores[acc]['factors'].append('spread_over_time')
        
        # Finalize scores
        for acc in scores:
            scores[acc]['score'] = min(round(scores[acc]['score'], 1), 100)
            score_val = scores[acc]['score']
            if score_val >= 70:
                scores[acc]['risk_level'] = 'HIGH'
            elif score_val >= 40:
                scores[acc]['risk_level'] = 'MEDIUM'
        
        self.suspicious_accounts = dict(scores)
        logger.info(f"Scoring done in {time.time()-start:.3f}s")
        return dict(scores)
    
    def construct_fraud_rings(self) -> List[Dict]:
        """Construct fraud rings from detected patterns."""
        start = time.time()
        rings = []
        ring_id = 1
        
        # Cycles
        for cycle in self.detected_cycles:
            scores = [self.suspicious_accounts.get(a, {}).get('score', 0) for a in cycle]
            rings.append({
                'ring_id': f'RING_{ring_id:03d}',
                'pattern_type': 'cycle',
                'member_accounts': cycle,
                'member_count': len(cycle),
                'risk_score': sum(scores) / len(scores) if scores else 0,
                'description': f'Circular routing: {len(cycle)} accounts'
            })
            ring_id += 1
        
        # Fan-in
        for p in self.detected_fanin:
            members = [p['receiver']] + p['senders']
            scores = [self.suspicious_accounts.get(a, {}).get('score', 0) for a in members]
            rings.append({
                'ring_id': f'RING_{ring_id:03d}',
                'pattern_type': 'fan_in',
                'member_accounts': members,
                'member_count': len(members),
                'risk_score': sum(scores) / len(scores) if scores else 0,
                'description': f'Smurfing: {p["count"]} senders → 1 receiver'
            })
            ring_id += 1
        
        # Fan-out
        for p in self.detected_fanout:
            members = [p['sender']] + p['receivers']
            scores = [self.suspicious_accounts.get(a, {}).get('score', 0) for a in members]
            rings.append({
                'ring_id': f'RING_{ring_id:03d}',
                'pattern_type': 'fan_out',
                'member_accounts': members,
                'member_count': len(members),
                'risk_score': sum(scores) / len(scores) if scores else 0,
                'description': f'Smurfing: 1 sender → {p["count"]} receivers'
            })
            ring_id += 1
        
        # Shell chains
        for chain in self.detected_chains:
            scores = [self.suspicious_accounts.get(a, {}).get('score', 0) for a in chain]
            rings.append({
                'ring_id': f'RING_{ring_id:03d}',
                'pattern_type': 'shell_chain',
                'member_accounts': chain,
                'member_count': len(chain),
                'risk_score': sum(scores) / len(scores) if scores else 0,
                'description': f'Shell network: {len(chain)}-hop chain'
            })
            ring_id += 1
        
        # Sort by risk score
        rings.sort(key=lambda x: x['risk_score'], reverse=True)
        self.fraud_rings = rings
        
        logger.info(f"Built {len(rings)} rings in {time.time()-start:.3f}s")
        return rings
    
    def run_full_detection(self) -> Dict[str, Any]:
        """Run complete detection pipeline."""
        total_start = time.time()
        logger.info("=== Starting Optimized Detection Pipeline ===")
        
        # 1. Detect patterns
        self.detect_cycles()
        self.detect_smurfing_patterns()
        self.detect_shell_chains()
        
        # 2. Score accounts
        self.calculate_suspicion_scores()
        
        # 3. Build rings
        self.construct_fraud_rings()
        
        # Summary
        high_risk = sum(1 for s in self.suspicious_accounts.values() if s['risk_level'] == 'HIGH')
        medium_risk = sum(1 for s in self.suspicious_accounts.values() if s['risk_level'] == 'MEDIUM')
        
        total_time = time.time() - total_start
        logger.info(f"=== Detection Complete in {total_time:.2f}s ===")
        
        return {
            'suspicious_accounts': self.suspicious_accounts,
            'fraud_rings': self.fraud_rings,
            'detection_summary': {
                'cycles_detected': len(self.detected_cycles),
                'fanin_detected': len(self.detected_fanin),
                'fanout_detected': len(self.detected_fanout),
                'chains_detected': len(self.detected_chains),
                'total_rings': len(self.fraud_rings),
                'high_risk_accounts': high_risk,
                'medium_risk_accounts': medium_risk,
                'processing_time_seconds': round(total_time, 2)
            }
        }
