"""
Money Muling Fraud Detection Engine
Graph-based pattern detection for financial crime analysis
"""
import networkx as nx
import pandas as pd
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict, deque
import logging
import time
from datetime import timedelta

logger = logging.getLogger(__name__)

# Maximum seconds allowed for cycle enumeration before early stop
CYCLE_ENUMERATION_TIMEOUT = 5.0
# Maximum number of cycles to collect before stopping
MAX_CYCLES_LIMIT = 500


class FraudDetectionEngine:
    """
    Detects money muling patterns using graph analysis and temporal features.
    
    Patterns Detected:
    1. Circular fund routing (cycles)
    2. Smurfing (fan-in/fan-out)
    3. Shell networks (layered chains)
    """
    
    def __init__(self, graph: nx.DiGraph, transactions_df: pd.DataFrame):
        """
        Initialize detection engine.
        
        Args:
            graph: NetworkX directed graph with transaction edges
            transactions_df: Pandas DataFrame with transaction data
        """
        self.graph = graph
        self.df = transactions_df
        
        # Precompute expensive operations
        self._precompute_metrics()
        
        # Detection results storage
        self.detected_cycles = []
        self.detected_fanin = []
        self.detected_fanout = []
        self.detected_chains = []
        self.suspicious_accounts = {}
        self.fraud_rings = []
        
        # Whitelisted legitimate accounts (merchants, payroll)
        self.whitelisted_accounts: Set[str] = set()
        self._identify_legitimate_accounts()
        
    def _precompute_metrics(self):
        """
        Precompute graph metrics to avoid repeated calculations.
        Complexity: O(V + E)
        """
        logger.info("Precomputing graph metrics...")
        
        # Degree maps - O(V)
        self.in_degree = dict(self.graph.in_degree())
        self.out_degree = dict(self.graph.out_degree())
        self.total_degree = {
            node: self.in_degree.get(node, 0) + self.out_degree.get(node, 0)
            for node in self.graph.nodes()
        }
        
        # Transaction count per account - O(n) where n = number of transactions
        sender_counts = self.df['sender_id'].value_counts().to_dict()
        receiver_counts = self.df['receiver_id'].value_counts().to_dict()
        
        self.transaction_counts = defaultdict(int)
        for acc in self.graph.nodes():
            self.transaction_counts[acc] = sender_counts.get(acc, 0) + receiver_counts.get(acc, 0)
        
        # Sort transactions by timestamp for temporal analysis - O(n log n)
        self.df_sorted = self.df.sort_values('timestamp').reset_index(drop=True)
        
        logger.info(f"Precomputation complete. {len(self.graph.nodes())} nodes, {len(self.graph.edges())} edges")

    def _identify_legitimate_accounts(self):
        """
        Identify and whitelist legitimate high-volume accounts:
        - Merchants: high fan-in (many payers), very low fan-out, consistent amounts
        - Payroll: high fan-out (many payees), very low fan-in, regular timing
        
        These MUST NOT be flagged as suspicious (hackathon false-positive requirement).
        """
        logger.info("Identifying legitimate merchant/payroll accounts...")

        num_nodes = len(self.graph.nodes())
        # Adaptive threshold: for small datasets use 5, larger ones use 8
        volume_threshold = max(5, min(8, num_nodes // 10))

        for account in self.graph.nodes():
            in_deg = self.in_degree.get(account, 0)
            out_deg = self.out_degree.get(account, 0)

            # --- Merchant heuristic ---
            # High fan-in (many payers) but very few outgoing connections
            if in_deg >= volume_threshold and out_deg <= 2:
                # Confirm with amount consistency: merchants have varied customers
                received = self.df[self.df['receiver_id'] == account]
                if len(received) >= volume_threshold:
                    unique_senders = received['sender_id'].nunique()
                    # Legitimate merchant: many distinct senders
                    if unique_senders >= volume_threshold:
                        self.whitelisted_accounts.add(account)
                        logger.info(f"Whitelisted MERCHANT: {account} "
                                    f"(in_deg={in_deg}, unique_senders={unique_senders})")
                        continue

            # --- Payroll heuristic ---
            # High fan-out (many payees) but very few incoming connections
            if out_deg >= volume_threshold and in_deg <= 2:
                sent = self.df[self.df['sender_id'] == account]
                if len(sent) >= volume_threshold:
                    unique_receivers = sent['receiver_id'].nunique()
                    # Check amount consistency (payroll tends to have similar amounts)
                    if unique_receivers >= volume_threshold:
                        amounts = sent['amount'].values
                        cv = amounts.std() / max(amounts.mean(), 1)  # coefficient of variation
                        if cv < 0.5:  # relatively consistent amounts
                            self.whitelisted_accounts.add(account)
                            logger.info(f"Whitelisted PAYROLL: {account} "
                                        f"(out_deg={out_deg}, unique_receivers={unique_receivers}, cv={cv:.2f})")
                            continue

        logger.info(f"Whitelisted {len(self.whitelisted_accounts)} legitimate accounts: "
                    f"{self.whitelisted_accounts}")

    def detect_cycles(self, min_length: int = 3, max_length: int = 5) -> List[List[str]]:
        """
        Detect circular fund routing patterns (cycles).
        
        Cycles indicate money returning to original account through intermediaries,
        a classic money laundering pattern.
        
        Complexity: O(V + E) for simple_cycles with bounded length
        
        Args:
            min_length: Minimum cycle length
            max_length: Maximum cycle length
            
        Returns:
            List of detected cycles (each cycle is a list of account IDs)
        """
        logger.info(f"Detecting cycles (length {min_length}-{max_length})...")
        
        detected = []
        
        try:
            # NetworkX simple_cycles returns all elementary cycles
            # Time-limit to prevent exponential blowup on dense graphs (≤30s budget)
            all_cycles = nx.simple_cycles(self.graph)
            start_time = time.time()
            
            for cycle in all_cycles:
                # Enforce time and count limits for ≤30s processing requirement
                if time.time() - start_time > CYCLE_ENUMERATION_TIMEOUT:
                    logger.warning(f"Cycle enumeration timeout after {CYCLE_ENUMERATION_TIMEOUT}s, "
                                   f"collected {len(detected)} cycles so far")
                    break
                if len(detected) >= MAX_CYCLES_LIMIT:
                    logger.warning(f"Cycle limit reached ({MAX_CYCLES_LIMIT}), stopping enumeration")
                    break

                cycle_length = len(cycle)
                if min_length <= cycle_length <= max_length:
                    detected.append(cycle)
                    logger.debug(f"Cycle detected: {cycle}")
            
        except Exception as e:
            logger.error(f"Error in cycle detection: {str(e)}")
        
        self.detected_cycles = detected
        logger.info(f"Found {len(detected)} cycles")
        return detected
    
    def detect_smurfing_patterns(self, threshold: int = None, time_window_hours: int = 72) -> Dict[str, List[Dict]]:
        """
        Detect smurfing patterns (structuring): fan-in and fan-out.
        
        Fan-in: Multiple sources → Single destination (collection)
        Fan-out: Single source → Multiple destinations (distribution)
        
        Uses adaptive threshold based on dataset size for better recall.
        Excludes whitelisted merchant/payroll accounts to avoid false positives.
        
        Complexity: O(n log n) due to sorting, then O(n) for sliding window
        
        Args:
            threshold: Minimum number of unique counterparties (None = auto)
            time_window_hours: Time window in hours
            
        Returns:
            Dict with 'fan_in' and 'fan_out' lists
        """
        # Adaptive threshold: smaller for small datasets to improve recall (≥60%)
        if threshold is None:
            num_accounts = len(self.graph.nodes())
            if num_accounts < 50:
                threshold = 5
            elif num_accounts < 200:
                threshold = 7
            else:
                threshold = 10

        logger.info(f"Detecting smurfing patterns (threshold={threshold}, window={time_window_hours}h)...")
        
        time_window = timedelta(hours=time_window_hours)
        
        fan_in_patterns = []
        fan_out_patterns = []
        
        # Fan-in detection: Group by receiver, check senders in time window
        # Complexity: O(n) after sorting
        receiver_groups = defaultdict(list)
        for _, row in self.df_sorted.iterrows():
            receiver_groups[row['receiver_id']].append({
                'sender': row['sender_id'],
                'timestamp': row['timestamp'],
                'amount': row['amount']
            })
        
        for receiver, transactions in receiver_groups.items():
            if len(transactions) < threshold:
                continue
            
            # Sliding window approach
            for i in range(len(transactions)):
                window_start = transactions[i]['timestamp']
                window_end = window_start + time_window
                
                # Count unique senders in window
                senders_in_window = set()
                window_transactions = []
                
                for j in range(i, len(transactions)):
                    if transactions[j]['timestamp'] > window_end:
                        break
                    senders_in_window.add(transactions[j]['sender'])
                    window_transactions.append(transactions[j])
                
                if len(senders_in_window) >= threshold:
                    fan_in_patterns.append({
                        'receiver': receiver,
                        'senders': list(senders_in_window),
                        'count': len(senders_in_window),
                        'time_window': (window_start, window_end),
                        'total_amount': sum(t['amount'] for t in window_transactions)
                    })
                    logger.debug(f"Fan-in detected: {receiver} received from {len(senders_in_window)} accounts")
                    break  # One detection per receiver is sufficient
        
        # Fan-out detection: Group by sender, check receivers in time window
        # Complexity: O(n) after sorting
        sender_groups = defaultdict(list)
        for _, row in self.df_sorted.iterrows():
            sender_groups[row['sender_id']].append({
                'receiver': row['receiver_id'],
                'timestamp': row['timestamp'],
                'amount': row['amount']
            })
        
        for sender, transactions in sender_groups.items():
            if len(transactions) < threshold:
                continue
            
            # Sliding window approach
            for i in range(len(transactions)):
                window_start = transactions[i]['timestamp']
                window_end = window_start + time_window
                
                # Count unique receivers in window
                receivers_in_window = set()
                window_transactions = []
                
                for j in range(i, len(transactions)):
                    if transactions[j]['timestamp'] > window_end:
                        break
                    receivers_in_window.add(transactions[j]['receiver'])
                    window_transactions.append(transactions[j])
                
                if len(receivers_in_window) >= threshold:
                    fan_out_patterns.append({
                        'sender': sender,
                        'receivers': list(receivers_in_window),
                        'count': len(receivers_in_window),
                        'time_window': (window_start, window_end),
                        'total_amount': sum(t['amount'] for t in window_transactions)
                    })
                    logger.debug(f"Fan-out detected: {sender} sent to {len(receivers_in_window)} accounts")
                    break  # One detection per sender is sufficient
        
        self.detected_fanin = fan_in_patterns
        self.detected_fanout = fan_out_patterns
        
        logger.info(f"Found {len(fan_in_patterns)} fan-in and {len(fan_out_patterns)} fan-out patterns")
        
        return {
            'fan_in': fan_in_patterns,
            'fan_out': fan_out_patterns
        }
    
    def detect_shell_chains(self, min_length: int = 3, max_degree: int = 3) -> List[List[str]]:
        """
        Detect layered shell networks (transaction chains through low-activity accounts).
        
        Shell accounts act as intermediaries to obscure money trail.
        Characteristics: Low total degree, sequential timestamps.
        
        Complexity: O(V * E) in worst case, but typically O(V * k) where k is average degree
        
        Args:
            min_length: Minimum chain length
            max_degree: Maximum total degree for intermediate nodes
            
        Returns:
            List of detected chains (each chain is a list of account IDs)
        """
        logger.info(f"Detecting shell chains (min_length={min_length}, max_degree={max_degree})...")
        
        detected_chains = []
        
        # Get transaction edges with timestamps
        edge_timestamps = {}
        for _, row in self.df.iterrows():
            edge = (row['sender_id'], row['receiver_id'])
            if edge not in edge_timestamps:
                edge_timestamps[edge] = []
            edge_timestamps[edge].append(row['timestamp'])
        
        # For each node, try to build chains using BFS
        for start_node in self.graph.nodes():
            # Skip if node itself is low degree (we want active sources)
            if self.out_degree.get(start_node, 0) == 0:
                continue
            
            # BFS to find chains
            queue = deque([(start_node, [start_node], None)])  # (current, path, last_timestamp)
            
            while queue:
                current, path, last_ts = queue.popleft()
                
                # Check if we have a valid chain
                if len(path) >= min_length:
                    # Validate chain: intermediates should be low-degree
                    valid = True
                    for i in range(1, len(path) - 1):  # Skip first and last
                        if self.total_degree.get(path[i], 0) > max_degree:
                            valid = False
                            break
                    
                    if valid:
                        detected_chains.append(path[:])
                        logger.debug(f"Shell chain detected: {' -> '.join(path)}")
                        continue  # Don't extend this path further
                
                # Don't grow chains too long (performance)
                if len(path) >= min_length + 2:
                    continue
                
                # Explore neighbors
                for neighbor in self.graph.successors(current):
                    # Avoid cycles in path
                    if neighbor in path:
                        continue
                    
                    # Check if intermediate node has low degree
                    if len(path) > 1 and self.total_degree.get(neighbor, 0) > max_degree:
                        continue
                    
                    # Check timestamp ordering (monotonic increase)
                    edge = (current, neighbor)
                    if edge in edge_timestamps:
                        edge_ts = min(edge_timestamps[edge])  # Use earliest transaction
                        if last_ts is not None and edge_ts < last_ts:
                            continue  # Not sequential
                        
                        queue.append((neighbor, path + [neighbor], edge_ts))
        
        # Deduplicate chains (remove subchains)
        unique_chains = []
        for chain in detected_chains:
            is_subchain = False
            for other in detected_chains:
                if chain != other and self._is_sublist(chain, other):
                    is_subchain = True
                    break
            if not is_subchain:
                unique_chains.append(chain)
        
        self.detected_chains = unique_chains
        logger.info(f"Found {len(unique_chains)} unique shell chains")
        return unique_chains
    
    def _is_sublist(self, sublist: List, mainlist: List) -> bool:
        """Check if sublist is contained in mainlist as consecutive elements."""
        n = len(sublist)
        m = len(mainlist)
        for i in range(m - n + 1):
            if mainlist[i:i+n] == sublist:
                return True
        return False
    
    def calculate_suspicion_scores(self) -> Dict[str, Dict[str, Any]]:
        """
        Calculate suspicion score (0-100) for each account.
        
        Scoring Model:
        - +40: Part of cycle (circular routing)
        - +30: Fan-in hub (smurfing collection)
        - +30: Fan-out hub (smurfing distribution)
        - +20: Shell chain intermediate
        - Velocity multiplier: Rapid transfers (< 24h between transactions)
        - Penalty: Transactions spread over many days (legitimate behavior)
        
        Complexity: O(V + n) where V is vertices, n is transactions
        
        Returns:
            Dict mapping account_id to score details
        """
        logger.info("Calculating suspicion scores...")
        
        scores = defaultdict(lambda: {
            'score': 0,
            'factors': [],
            'patterns': [],
            'risk_level': 'LOW'
        })
        
        # 1. Cycle participation: +40
        for cycle in self.detected_cycles:
            for account in cycle:
                scores[account]['score'] += 40
                scores[account]['factors'].append('cycle_member')
                scores[account]['patterns'].append('cycle')
        
        # 2. Fan-in hub: +30
        for pattern in self.detected_fanin:
            account = pattern['receiver']
            scores[account]['score'] += 30
            scores[account]['factors'].append('fan_in_hub')
            scores[account]['patterns'].append('fan_in')
        
        # 3. Fan-out hub: +30
        for pattern in self.detected_fanout:
            account = pattern['sender']
            scores[account]['score'] += 30
            scores[account]['factors'].append('fan_out_hub')
            scores[account]['patterns'].append('fan_out')
        
        # 4. Shell chain intermediate: +20
        for chain in self.detected_chains:
            # Only intermediate nodes (not first or last)
            for account in chain[1:-1]:
                scores[account]['score'] += 20
                scores[account]['factors'].append('shell_intermediate')
                scores[account]['patterns'].append('shell_chain')
        
        # 5. Velocity multiplier: Rapid transfers
        # Get transactions per account and check time gaps
        for account in self.graph.nodes():
            # Get all transactions involving this account
            account_txns = self.df_sorted[
                (self.df_sorted['sender_id'] == account) | 
                (self.df_sorted['receiver_id'] == account)
            ].sort_values('timestamp')
            
            if len(account_txns) > 1:
                # Check for rapid consecutive transactions
                timestamps = account_txns['timestamp'].values
                rapid_count = 0
                
                for i in range(len(timestamps) - 1):
                    time_diff = timestamps[i + 1] - timestamps[i]
                    if pd.Timedelta(time_diff).total_seconds() < 86400:  # < 24 hours
                        rapid_count += 1
                
                if rapid_count >= 2:  # At least 2 rapid transactions
                    # Cap multiplier at 2.0 to prevent score inflation (precision ≥70%)
                    multiplier = min(1 + (rapid_count * 0.1), 2.0)
                    scores[account]['score'] *= multiplier
                    scores[account]['factors'].append(f'velocity_x{multiplier:.1f}')
        
        # 6. Whitelisted account protection (MUST NOT flag merchants/payroll)
        # BUT keep pattern membership if found in smurfing rings so graph
        # highlighting still works.
        smurfing_members = set()
        for p in self.detected_fanin:
            smurfing_members.add(p['receiver'])
            smurfing_members.update(p['senders'])
        for p in self.detected_fanout:
            smurfing_members.add(p['sender'])
            smurfing_members.update(p['receivers'])

        for account in self.whitelisted_accounts:
            if account in scores:
                # If the account is part of a detected smurfing ring, keep
                # its patterns so the fraud ring is still constructed, but
                # apply a moderate score instead of zeroing it.
                if account in smurfing_members:
                    scores[account]['score'] = max(scores[account]['score'] * 0.5, 30)
                    scores[account]['factors'].append('whitelisted_but_smurfing_member')
                    logger.info(f"Reduced (not zeroed) score for whitelisted smurfing member {account}")
                else:
                    scores[account]['score'] = 0
                    scores[account]['factors'] = ['whitelisted_legitimate_account']
                    scores[account]['patterns'] = []
                    scores[account]['risk_level'] = 'LOW'
                    logger.info(f"Zeroed score for whitelisted account {account}")

        # 7. Penalty for legitimate patterns
        for account in self.graph.nodes():
            if account in self.whitelisted_accounts:
                continue

            account_txns = self.df_sorted[
                (self.df_sorted['sender_id'] == account) | 
                (self.df_sorted['receiver_id'] == account)
            ]
            
            if len(account_txns) > 0:
                # Check if transactions are spread over many days
                time_span = (account_txns['timestamp'].max() - account_txns['timestamp'].min())
                days_span = time_span.total_seconds() / 86400
                
                if days_span > 7 and len(account_txns) < 20:
                    # Regular, spread-out activity
                    scores[account]['score'] *= 0.7  # 30% reduction
                    scores[account]['factors'].append('spread_over_time')
        
        # 7. Cap scores at 100 and assign risk levels
        for account in scores:
            scores[account]['score'] = min(scores[account]['score'], 100)
            score_val = scores[account]['score']
            
            if score_val >= 70:
                scores[account]['risk_level'] = 'HIGH'
            elif score_val >= 40:
                scores[account]['risk_level'] = 'MEDIUM'
            else:
                scores[account]['risk_level'] = 'LOW'
        
        self.suspicious_accounts = dict(scores)
        
        # Log summary
        high_risk = sum(1 for s in scores.values() if s['risk_level'] == 'HIGH')
        medium_risk = sum(1 for s in scores.values() if s['risk_level'] == 'MEDIUM')
        
        logger.info(f"Scoring complete. High risk: {high_risk}, Medium risk: {medium_risk}")
        
        return dict(scores)
    
    def construct_fraud_rings(self) -> List[Dict[str, Any]]:
        """
        Group suspicious accounts into fraud rings based on detected patterns.
        
        A fraud ring is a group of accounts involved in the same fraudulent pattern.
        
        Complexity: O(R) where R is number of detected patterns
        
        Returns:
            List of fraud rings with metadata
        """
        logger.info("Constructing fraud rings...")
        
        rings = []
        ring_id_counter = 1
        
        # 1. Cycle-based rings
        for cycle in self.detected_cycles:
            member_scores = [
                self.suspicious_accounts.get(acc, {}).get('score', 0)
                for acc in cycle
            ]
            avg_score = sum(member_scores) / len(member_scores) if member_scores else 0
            
            rings.append({
                'ring_id': f'RING_{ring_id_counter:03d}',
                'pattern_type': 'cycle',
                'member_accounts': cycle,
                'member_count': len(cycle),
                'risk_score': avg_score,
                'description': f'Circular fund routing through {len(cycle)} accounts'
            })
            ring_id_counter += 1
        
        # 2. Fan-in rings
        for pattern in self.detected_fanin:
            members = [pattern['receiver']] + pattern['senders']
            member_scores = [
                self.suspicious_accounts.get(acc, {}).get('score', 0)
                for acc in members
            ]
            avg_score = sum(member_scores) / len(member_scores) if member_scores else 0
            
            rings.append({
                'ring_id': f'RING_{ring_id_counter:03d}',
                'pattern_type': 'fan_in',
                'member_accounts': members,
                'member_count': len(members),
                'risk_score': avg_score,
                'description': f'Smurfing collection: {pattern["count"]} senders → 1 receiver'
            })
            ring_id_counter += 1
        
        # 3. Fan-out rings
        for pattern in self.detected_fanout:
            members = [pattern['sender']] + pattern['receivers']
            member_scores = [
                self.suspicious_accounts.get(acc, {}).get('score', 0)
                for acc in members
            ]
            avg_score = sum(member_scores) / len(member_scores) if member_scores else 0
            
            rings.append({
                'ring_id': f'RING_{ring_id_counter:03d}',
                'pattern_type': 'fan_out',
                'member_accounts': members,
                'member_count': len(members),
                'risk_score': avg_score,
                'description': f'Smurfing distribution: 1 sender → {pattern["count"]} receivers'
            })
            ring_id_counter += 1
        
        # 4. Shell chain rings
        for chain in self.detected_chains:
            member_scores = [
                self.suspicious_accounts.get(acc, {}).get('score', 0)
                for acc in chain
            ]
            avg_score = sum(member_scores) / len(member_scores) if member_scores else 0
            
            rings.append({
                'ring_id': f'RING_{ring_id_counter:03d}',
                'pattern_type': 'shell_chain',
                'member_accounts': chain,
                'member_count': len(chain),
                'risk_score': avg_score,
                'description': f'Layered shell network: {len(chain)}-hop chain'
            })
            ring_id_counter += 1
        
        # Sort by risk score (highest first)
        rings.sort(key=lambda x: x['risk_score'], reverse=True)
        
        self.fraud_rings = rings
        logger.info(f"Constructed {len(rings)} fraud rings")
        
        return rings
    
    def run_full_detection(self) -> Dict[str, Any]:
        """
        Run complete fraud detection pipeline.
        
        Returns:
            Detection results with suspicious accounts and fraud rings
        """
        logger.info("=== Starting Full Fraud Detection Pipeline ===")
        
        # 1. Detect patterns (adaptive thresholds for recall ≥60%)
        self.detect_cycles(min_length=3, max_length=5)
        self.detect_smurfing_patterns(threshold=None, time_window_hours=72)  # adaptive
        self.detect_shell_chains(min_length=3, max_degree=3)
        
        # 2. Calculate scores
        self.calculate_suspicion_scores()
        
        # 3. Construct rings
        self.construct_fraud_rings()
        
        # 4. Prepare results
        results = {
            'suspicious_accounts': self.suspicious_accounts,
            'fraud_rings': self.fraud_rings,
            'detection_summary': {
                'cycles_detected': len(self.detected_cycles),
                'fanin_detected': len(self.detected_fanin),
                'fanout_detected': len(self.detected_fanout),
                'chains_detected': len(self.detected_chains),
                'total_rings': len(self.fraud_rings),
                'high_risk_accounts': sum(
                    1 for s in self.suspicious_accounts.values() 
                    if s['risk_level'] == 'HIGH'
                ),
                'medium_risk_accounts': sum(
                    1 for s in self.suspicious_accounts.values() 
                    if s['risk_level'] == 'MEDIUM'
                )
            }
        }
        
        logger.info("=== Detection Pipeline Complete ===")
        logger.info(f"Summary: {results['detection_summary']}")
        
        return results


# Complexity Analysis:
# 
# Overall Complexity: O(n log n + V*E)
# where n = number of transactions, V = vertices (accounts), E = edges
#
# Breakdown:
# - Precomputation: O(V + E)
# - Cycle detection: O((V+E) * C) where C is number of cycles (bounded)
# - Smurfing detection: O(n log n) for sorting + O(n) for sliding window
# - Shell chain detection: O(V * k) where k is average degree (typically small)
# - Scoring: O(V + n)
# - Ring construction: O(R) where R is number of patterns
#
# For 10K transactions with ~1K accounts:
# Estimated runtime: 2-5 seconds on modern hardware
#
# Performance optimizations:
# 1. Precomputed degree maps (avoid repeated graph queries)
# 2. Sorted DataFrame for temporal analysis (enables sliding windows)
# 3. Early termination in chain detection
# 4. Deduplication of chains
# 5. Bounded cycle lengths
#
# False Positive Control:
# 1. Time-window constraints (72h) reduce coincidental patterns
# 2. Threshold requirements (10+ accounts) filter out normal activity
# 3. Degree limits on shell accounts (≤3) focus on intermediaries
# 4. Velocity penalties for legitimate spread-out transactions
# 5. Score capping prevents over-scoring
# 6. Multiple pattern confirmation increases confidence
