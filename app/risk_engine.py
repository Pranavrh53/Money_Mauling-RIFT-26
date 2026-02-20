"""
Graphora Risk Intelligence Engine
Advanced risk scoring for financial crime detection with customized explanations
"""
import networkx as nx
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
from collections import defaultdict
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class RiskIntelligenceEngine:
    """
    Advanced risk scoring engine combining multiple financial crime indicators.
    
    Risk Factors (0-100 normalized):
    1. Degree Centrality (20%): Network connectivity
    2. Transaction Velocity (20%): Time-based activity patterns
    3. Cycle Involvement (25%): Circular routing participation
    4. Ring Density (20%): Connection strength within fraud rings
    5. Volume Anomalies (15%): Unusual transaction amounts
    """
    
    def __init__(self, graph: nx.DiGraph, transactions_df: pd.DataFrame, 
                 fraud_rings: List[Dict], suspicious_accounts: Dict,
                 cached_cycles: List[List[str]] = None,
                 whitelisted_accounts: set = None):
        """
        Initialize risk intelligence engine.
        
        Args:
            graph: NetworkX directed graph
            transactions_df: Transaction data
            fraud_rings: Detected fraud rings
            suspicious_accounts: Basic suspicion scores from detection engine
            cached_cycles: Pre-computed cycles from detection engine (avoids recomputation)
            whitelisted_accounts: Legitimate merchant/payroll accounts to exclude
        """
        self.graph = graph
        self.df = transactions_df
        self.fraud_rings = fraud_rings
        self.basic_scores = suspicious_accounts
        self.cached_cycles = cached_cycles or []
        self.whitelisted_accounts = whitelisted_accounts or set()
        
        # Risk scores storage
        self.risk_scores = {}
        self.risk_explanations = {}
        self.risk_factors = {}
        
        logger.info("Risk Intelligence Engine initialized")
    
    def calculate_degree_centrality_score(self) -> Dict[str, float]:
        """
        Calculate risk based on network centrality (0-100).
        
        High-degree nodes are hubs that can facilitate money laundering.
        
        Returns:
            Dict mapping account_id to centrality score (0-100)
        """
        logger.info("Calculating degree centrality scores...")
        
        # Calculate various centrality measures
        degree_centrality = nx.degree_centrality(self.graph)
        
        try:
            # Betweenness centrality (nodes on shortest paths between others)
            betweenness = nx.betweenness_centrality(self.graph)
        except:
            betweenness = {node: 0 for node in self.graph.nodes()}
        
        try:
            # PageRank (importance based on incoming connections)
            pagerank = nx.pagerank(self.graph)
        except:
            pagerank = {node: 0 for node in self.graph.nodes()}
        
        scores = {}
        for node in self.graph.nodes():
            # Combine centrality measures with weights
            degree_score = degree_centrality.get(node, 0) * 40
            betweenness_score = betweenness.get(node, 0) * 30
            pagerank_score = pagerank.get(node, 0) * 1000 * 30  # Scale PageRank
            
            # Normalize to 0-100
            total_score = min(degree_score + betweenness_score + pagerank_score, 100)
            scores[node] = total_score
        
        logger.info(f"Centrality scores calculated for {len(scores)} nodes")
        return scores
    
    def calculate_transaction_velocity_score(self) -> Dict[str, float]:
        """
        Calculate risk based on transaction velocity (0-100).
        
        Rapid, high-frequency transactions suggest automated layering.
        
        Returns:
            Dict mapping account_id to velocity score (0-100)
        """
        logger.info("Calculating transaction velocity scores...")
        
        scores = {}
        
        for account in self.graph.nodes():
            # Get all transactions for this account
            account_txns = self.df[
                (self.df['sender_id'] == account) | 
                (self.df['receiver_id'] == account)
            ].sort_values('timestamp')
            
            if len(account_txns) < 2:
                scores[account] = 0
                continue
            
            # Calculate time-based metrics
            time_span = (account_txns['timestamp'].max() - account_txns['timestamp'].min())
            total_seconds = max(time_span.total_seconds(), 1)
            total_hours = total_seconds / 3600
            
            # Transactions per hour
            txn_per_hour = len(account_txns) / max(total_hours, 1)
            
            # Calculate time gaps between consecutive transactions
            timestamps = account_txns['timestamp'].values
            time_gaps = []
            for i in range(len(timestamps) - 1):
                gap = pd.Timedelta(timestamps[i + 1] - timestamps[i]).total_seconds()
                time_gaps.append(gap)
            
            # Velocity indicators
            avg_gap_hours = np.mean(time_gaps) / 3600 if time_gaps else 999
            min_gap_hours = min(time_gaps) / 3600 if time_gaps else 999
            
            # Rapid transaction count (< 1 hour between transactions)
            rapid_count = sum(1 for gap in time_gaps if gap < 3600)
            rapid_ratio = rapid_count / len(time_gaps) if time_gaps else 0
            
            # Score calculation
            velocity_score = 0
            
            # High frequency: +40
            if txn_per_hour > 1:
                velocity_score += 40
            elif txn_per_hour > 0.5:
                velocity_score += 30
            elif txn_per_hour > 0.2:
                velocity_score += 20
            
            # Rapid sequences: +35
            if rapid_ratio > 0.5:
                velocity_score += 35
            elif rapid_ratio > 0.3:
                velocity_score += 25
            elif rapid_ratio > 0.1:
                velocity_score += 15
            
            # Very short minimum gap: +25
            if min_gap_hours < 0.5:
                velocity_score += 25
            elif min_gap_hours < 2:
                velocity_score += 15
            elif min_gap_hours < 6:
                velocity_score += 10
            
            scores[account] = min(velocity_score, 100)
        
        logger.info(f"Velocity scores calculated for {len(scores)} nodes")
        return scores
    
    def calculate_cycle_involvement_score(self) -> Dict[str, float]:
        """
        Calculate risk based on cycle involvement (0-100).
        
        Nodes in multiple cycles or complex cycles are high risk.
        
        Returns:
            Dict mapping account_id to cycle score (0-100)
        """
        logger.info("Calculating cycle involvement scores...")
        
        # Reuse cached cycles from detection engine instead of recomputing
        # This saves the most expensive operation (nx.simple_cycles is O(exponential))
        all_cycles = self.cached_cycles
        if not all_cycles:
            try:
                import time as _time
                _start = _time.time()
                all_cycles = []
                for cycle in nx.simple_cycles(self.graph):
                    all_cycles.append(cycle)
                    if _time.time() - _start > 5.0 or len(all_cycles) >= 500:
                        break
            except:
                all_cycles = []
        
        scores = {node: 0 for node in self.graph.nodes()}
        cycle_counts = defaultdict(int)
        cycle_complexities = defaultdict(list)
        
        for cycle in all_cycles:
            cycle_length = len(cycle)
            
            # Weight by cycle complexity
            complexity_weight = min(cycle_length * 10, 50)
            
            for node in cycle:
                cycle_counts[node] += 1
                cycle_complexities[node].append(cycle_length)
        
        for node in self.graph.nodes():
            count = cycle_counts[node]
            complexities = cycle_complexities[node]
            
            # Score components
            # Base score for any cycle involvement: +50
            if count > 0:
                base_score = 50
                
                # Multiple cycles: +30
                if count > 2:
                    multi_cycle_score = 30
                elif count > 1:
                    multi_cycle_score = 20
                else:
                    multi_cycle_score = 0
                
                # Complex cycles (length > 3): +20
                avg_complexity = np.mean(complexities) if complexities else 0
                if avg_complexity > 4:
                    complexity_score = 20
                elif avg_complexity > 3:
                    complexity_score = 15
                else:
                    complexity_score = 0
                
                scores[node] = min(base_score + multi_cycle_score + complexity_score, 100)
        
        logger.info(f"Cycle involvement scores calculated for {len(scores)} nodes")
        return scores
    
    def calculate_ring_density_score(self) -> Dict[str, float]:
        """
        Calculate risk based on fraud ring density (0-100).
        
        Nodes deeply connected within fraud rings are high risk.
        
        Returns:
            Dict mapping account_id to ring density score (0-100)
        """
        logger.info("Calculating ring density scores...")
        
        scores = {node: 0 for node in self.graph.nodes()}
        
        for ring in self.fraud_rings:
            members = set(ring['member_accounts'])
            member_count = len(members)
            
            if member_count < 2:
                continue
            
            # Create subgraph of ring members
            ring_subgraph = self.graph.subgraph(members)
            
            # Calculate density: actual edges / possible edges
            possible_edges = member_count * (member_count - 1)
            actual_edges = ring_subgraph.number_of_edges()
            density = actual_edges / max(possible_edges, 1)
            
            # Ring risk multiplier
            ring_risk = ring.get('risk_score', 50) / 100
            
            for member in members:
                # Node's degree within ring
                in_ring_degree = ring_subgraph.degree(member) if member in ring_subgraph else 0
                degree_ratio = in_ring_degree / max(member_count - 1, 1)
                
                # Score calculation
                # Base score from ring density: 0-50
                density_score = density * 50
                
                # Individual connectivity within ring: 0-30
                connectivity_score = degree_ratio * 30
                
                # Ring inherent risk: 0-20
                ring_base_score = ring_risk * 20
                
                total_score = density_score + connectivity_score + ring_base_score
                
                # Take maximum if node is in multiple rings
                scores[member] = max(scores[member], min(total_score, 100))
        
        logger.info(f"Ring density scores calculated for {len(scores)} nodes")
        return scores
    
    def calculate_volume_anomaly_score(self) -> Dict[str, float]:
        """
        Calculate risk based on transaction volume anomalies (0-100).
        
        Unusual amounts compared to network average suggest structuring.
        
        Returns:
            Dict mapping account_id to volume anomaly score (0-100)
        """
        logger.info("Calculating volume anomaly scores...")
        
        # Calculate global statistics
        all_amounts = self.df['amount'].values
        global_mean = np.mean(all_amounts)
        global_std = np.std(all_amounts)
        global_median = np.median(all_amounts)
        
        scores = {}
        
        for account in self.graph.nodes():
            # Get transactions for this account
            sent = self.df[self.df['sender_id'] == account]['amount']
            received = self.df[self.df['receiver_id'] == account]['amount']
            
            all_txns = pd.concat([sent, received])
            
            if len(all_txns) == 0:
                scores[account] = 0
                continue
            
            # Calculate account-specific statistics
            account_mean = all_txns.mean()
            account_std = all_txns.std()
            account_median = all_txns.median()
            account_max = all_txns.max()
            account_min = all_txns.min()
            
            # Anomaly indicators
            score = 0
            
            # 1. Z-score deviation from global mean: 0-35
            z_score = abs(account_mean - global_mean) / max(global_std, 1)
            if z_score > 3:
                score += 35
            elif z_score > 2:
                score += 25
            elif z_score > 1:
                score += 15
            
            # 2. Many small transactions (structuring): 0-30
            small_txn_threshold = global_median * 0.3  # 30% of median
            small_txn_count = sum(1 for amt in all_txns if amt < small_txn_threshold)
            small_ratio = small_txn_count / len(all_txns)
            
            if small_ratio > 0.7 and len(all_txns) > 10:
                score += 30
            elif small_ratio > 0.5 and len(all_txns) > 5:
                score += 20
            
            # 3. High variance (inconsistent amounts): 0-20
            if account_std > account_mean * 0.8 and len(all_txns) > 3:
                score += 20
            elif account_std > account_mean * 0.5:
                score += 10
            
            # 4. Amounts just below round numbers (avoiding thresholds): 0-15
            suspicious_amounts = 0
            for amt in all_txns:
                # Check if just below 10k, 5k, etc.
                if 9500 <= amt < 10000 or 4500 <= amt < 5000:
                    suspicious_amounts += 1
            
            if suspicious_amounts > len(all_txns) * 0.3:
                score += 15
            elif suspicious_amounts > len(all_txns) * 0.1:
                score += 10
            
            scores[account] = min(score, 100)
        
        logger.info(f"Volume anomaly scores calculated for {len(scores)} nodes")
        return scores
    
    def generate_customized_explanation(self, account: str, risk_factors: Dict[str, float],
                                       final_score: float) -> str:
        """
        Generate customized risk explanation for each account.
        
        Args:
            account: Account ID
            risk_factors: Dict of factor scores
            final_score: Final risk score
            
        Returns:
            Customized explanation string
        """
        explanations = []
        
        # Get account-specific data
        account_txns = self.df[
            (self.df['sender_id'] == account) | 
            (self.df['receiver_id'] == account)
        ]
        
        txn_count = len(account_txns)
        total_volume = account_txns['amount'].sum()
        
        # Header based on risk level
        if final_score >= 85:
            explanations.append(f"⚠️ CRITICAL RISK: {account} poses severe money laundering threat.")
        elif final_score >= 70:
            explanations.append(f"⚠️ HIGH RISK: {account} exhibits strong indicators of fraud.")
        elif final_score >= 50:
            explanations.append(f"⚠️ ELEVATED RISK: {account} shows concerning patterns.")
        else:
            explanations.append(f"⚠️ SUSPICIOUS: {account} requires investigation.")
        
        # Degree Centrality
        if risk_factors['centrality'] > 70:
            degree = self.graph.degree(account)
            explanations.append(
                f"🔗 Network Hub: Highly connected with {degree} links. "
                f"Central position enables large-scale money movement coordination."
            )
        elif risk_factors['centrality'] > 40:
            explanations.append(
                f"🔗 Connected Account: Moderate network centrality. "
                f"Acts as intermediary in transaction chains."
            )
        
        # Transaction Velocity
        if risk_factors['velocity'] > 70:
            time_span = (account_txns['timestamp'].max() - account_txns['timestamp'].min())
            hours = max(time_span.total_seconds() / 3600, 1)
            rate = txn_count / hours
            explanations.append(
                f"⚡ High Velocity: {txn_count} transactions in {hours:.1f}h "
                f"({rate:.2f}/hour). Rapid movement typical of automated layering."
            )
        elif risk_factors['velocity'] > 40:
            explanations.append(
                f"⚡ Rapid Activity: {txn_count} transactions in short timeframe. "
                f"Accelerated pace suggests urgency to obscure funds."
            )
        
        # Cycle Involvement
        if risk_factors['cycle_involvement'] > 70:
            explanations.append(
                f"🔄 Multiple Cycles: Participates in complex circular routing. "
                f"Funds return to origin through layered intermediaries—classic laundering."
            )
        elif risk_factors['cycle_involvement'] > 50:
            explanations.append(
                f"🔄 Cycle Member: Part of circular money flow. "
                f"Indicates integration phase of laundering operation."
            )
        
        # Ring Density
        if risk_factors['ring_density'] > 70:
            explanations.append(
                f"👥 Fraud Ring Core: Deeply embedded in organized fraud network. "
                f"Dense connections suggest coordinated criminal operation."
            )
        elif risk_factors['ring_density'] > 40:
            explanations.append(
                f"👥 Ring Member: Connected to fraud ring. "
                f"Likely knows other members and operation structure."
            )
        
        # Volume Anomalies
        if risk_factors['volume_anomaly'] > 70:
            avg_amount = account_txns['amount'].mean()
            explanations.append(
                f"💰 Structuring Pattern: Transaction amounts highly anomalous (avg ${avg_amount:,.2f}). "
                f"Consistent with deliberate avoidance of reporting thresholds."
            )
        elif risk_factors['volume_anomaly'] > 40:
            explanations.append(
                f"💰 Unusual Amounts: Transaction values deviate from network norms. "
                f"May indicate smurfing or structuring activity."
            )
        
        # Pattern-specific insights
        patterns = self.basic_scores.get(account, {}).get('patterns', [])
        if 'fan_in' in patterns:
            senders = len(self.df[self.df['receiver_id'] == account]['sender_id'].unique())
            explanations.append(
                f"📥 Collection Point: Receives from {senders} different sources. "
                f"Consistent with smurfing collection or mule account aggregation."
            )
        
        if 'fan_out' in patterns:
            receivers = len(self.df[self.df['sender_id'] == account]['receiver_id'].unique())
            explanations.append(
                f"📤 Distribution Hub: Sends to {receivers} different destinations. "
                f"Matches smurfing distribution or layering schemes."
            )
        
        if 'shell_chain' in patterns:
            explanations.append(
                f"🏢 Shell Network: Acts as intermediate in multi-hop chain. "
                f"Typical of layering phase using shell accounts."
            )
        
        # Summary
        explanations.append(
            f"📊 Overall Assessment: Risk score {final_score:.1f}/100 "
            f"across {txn_count} transactions totaling ${total_volume:,.2f}. "
            f"Immediate investigation recommended."
        )
        
        return " ".join(explanations)
    
    def calculate_comprehensive_risk_scores(self) -> Dict[str, Any]:
        """
        Calculate comprehensive risk scores combining all factors.
        
        Returns:
            Dict with risk scores, factors, and explanations for all accounts
        """
        logger.info("=== Calculating Comprehensive Risk Scores ===")
        
        # Calculate individual risk factors
        centrality_scores = self.calculate_degree_centrality_score()
        velocity_scores = self.calculate_transaction_velocity_score()
        cycle_scores = self.calculate_cycle_involvement_score()
        ring_density_scores = self.calculate_ring_density_score()
        volume_anomaly_scores = self.calculate_volume_anomaly_score()
        
        # Weights for each factor (must sum to 1.0)
        weights = {
            'centrality': 0.20,
            'velocity': 0.20,
            'cycle_involvement': 0.25,
            'ring_density': 0.20,
            'volume_anomaly': 0.15
        }
        
        results = {}
        
        for account in self.graph.nodes():
            # Get individual scores
            factors = {
                'centrality': centrality_scores.get(account, 0),
                'velocity': velocity_scores.get(account, 0),
                'cycle_involvement': cycle_scores.get(account, 0),
                'ring_density': ring_density_scores.get(account, 0),
                'volume_anomaly': volume_anomaly_scores.get(account, 0)
            }
            
            # Calculate weighted average
            final_score = sum(factors[key] * weights[key] for key in factors)
            
            # Determine risk level
            if final_score >= 70:
                risk_level = 'CRITICAL'
            elif final_score >= 50:
                risk_level = 'HIGH'
            elif final_score >= 30:
                risk_level = 'MEDIUM'
            else:
                risk_level = 'LOW'
            
            # Generate customized explanation
            explanation = self.generate_customized_explanation(account, factors, final_score)
            
            # Zero out whitelisted legitimate accounts (merchants/payroll)
            if account in self.whitelisted_accounts:
                final_score = 0.0
                risk_level = 'LOW'
                explanation = (f"Account {account} has been identified as a legitimate "
                              f"high-volume account (e.g. merchant or payroll). No fraud risk.")

            results[account] = {
                'account_id': account,
                'risk_score': round(final_score, 2),
                'risk_level': risk_level,
                'risk_factors': {k: round(v, 2) for k, v in factors.items()},
                'explanation': explanation,
                'patterns': self.basic_scores.get(account, {}).get('patterns', [])
            }
        
        self.risk_scores = results
        
        # Log statistics
        critical = sum(1 for r in results.values() if r['risk_level'] == 'CRITICAL')
        high = sum(1 for r in results.values() if r['risk_level'] == 'HIGH')
        medium = sum(1 for r in results.values() if r['risk_level'] == 'MEDIUM')
        low = sum(1 for r in results.values() if r['risk_level'] == 'LOW')
        
        logger.info(f"Risk scoring complete: {critical} critical, {high} high, {medium} medium, {low} low")
        logger.info("=== Risk Intelligence Engine Complete ===")
        
        return results
    
    def get_top_risky_accounts(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get top N riskiest accounts.
        
        Args:
            limit: Number of accounts to return
            
        Returns:
            List of top risky accounts sorted by score
        """
        if not self.risk_scores:
            self.calculate_comprehensive_risk_scores()
        
        sorted_accounts = sorted(
            self.risk_scores.values(),
            key=lambda x: x['risk_score'],
            reverse=True
        )
        
        return sorted_accounts[:limit]
    
    def get_top_risky_rings(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get top N riskiest fraud rings with enhanced metrics.
        
        Args:
            limit: Number of rings to return
            
        Returns:
            List of top risky rings with calculated risk metrics
        """
        rings_with_scores = []
        
        for ring in self.fraud_rings:
            members = ring['member_accounts']
            
            # Calculate average risk score from comprehensive scores
            member_risk_scores = [
                self.risk_scores.get(member, {}).get('risk_score', 0)
                for member in members
            ]
            
            avg_risk = np.mean(member_risk_scores) if member_risk_scores else 0
            max_risk = max(member_risk_scores) if member_risk_scores else 0
            
            # Get transaction volume for ring
            ring_txns = self.df[
                (self.df['sender_id'].isin(members)) & 
                (self.df['receiver_id'].isin(members))
            ]
            
            total_volume = ring_txns['amount'].sum() if len(ring_txns) > 0 else 0
            txn_count = len(ring_txns)
            
            rings_with_scores.append({
                **ring,
                'avg_risk_score': round(avg_risk, 2),
                'max_risk_score': round(max_risk, 2),
                'total_volume': round(total_volume, 2),
                'transaction_count': txn_count
            })
        
        # Sort by average risk score
        sorted_rings = sorted(
            rings_with_scores,
            key=lambda x: x['avg_risk_score'],
            reverse=True
        )
        
        return sorted_rings[:limit]
