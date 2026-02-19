"""
Graph construction and analysis for transaction networks
"""
import networkx as nx
import pandas as pd
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


class TransactionGraph:
    """
    Directed graph representation of transaction network.
    Nodes: Account IDs (sender_id, receiver_id)
    Edges: Transaction relationships (sender → receiver)
    """
    
    def __init__(self):
        """Initialize an empty directed graph"""
        self.graph = nx.DiGraph()
        self._node_metrics = {}
        
    def build_from_dataframe(self, df: pd.DataFrame) -> None:
        """
        Construct graph from validated transaction DataFrame.
        
        Args:
            df: Pandas DataFrame with columns:
                - transaction_id
                - sender_id
                - receiver_id
                - amount
                - timestamp
        """
        logger.info(f"Building graph from {len(df)} transactions")
        
        # Extract unique accounts for nodes
        all_accounts = pd.concat([df['sender_id'], df['receiver_id']]).unique()
        
        # Add nodes (accounts)
        self.graph.add_nodes_from(all_accounts)
        logger.info(f"Added {len(all_accounts)} account nodes")
        
        # Add edges with attributes
        # Group by sender-receiver pairs to handle multiple transactions
        edge_data = []
        for _, row in df.iterrows():
            edge_data.append({
                'source': row['sender_id'],
                'target': row['receiver_id'],
                'amount': float(row['amount']),
                'timestamp': row['timestamp']
            })
        
        # Add edges to graph
        for edge in edge_data:
            source = edge['source']
            target = edge['target']
            amount = edge['amount']
            timestamp = edge['timestamp']
            
            # If edge exists, accumulate amount and store timestamps
            if self.graph.has_edge(source, target):
                self.graph[source][target]['amount'] += amount
                self.graph[source][target]['timestamps'].append(timestamp)
                self.graph[source][target]['transaction_count'] += 1
            else:
                self.graph.add_edge(
                    source, 
                    target,
                    amount=amount,
                    timestamps=[timestamp],
                    transaction_count=1
                )
        
        logger.info(f"Added {self.graph.number_of_edges()} edges")
        
        # Calculate node metrics
        self._calculate_node_metrics(df)
        
    def _calculate_node_metrics(self, df: pd.DataFrame) -> None:
        """
        Calculate metrics for each node using vectorized operations.
        
        Metrics:
        - in_degree: Number of incoming connections
        - out_degree: Number of outgoing connections
        - total_transactions: Total number of transactions
        - total_amount_sent: Sum of all outgoing amounts
        - total_amount_received: Sum of all incoming amounts
        """
        logger.info("Calculating node metrics")
        
        # Calculate sent amounts (grouped by sender)
        sent_stats = df.groupby('sender_id').agg({
            'amount': ['sum', 'count']
        }).reset_index()
        sent_stats.columns = ['account_id', 'total_sent', 'sent_count']
        
        # Calculate received amounts (grouped by receiver)
        received_stats = df.groupby('receiver_id').agg({
            'amount': ['sum', 'count']
        }).reset_index()
        received_stats.columns = ['account_id', 'total_received', 'received_count']
        
        # Merge statistics
        all_accounts = list(self.graph.nodes())
        
        for account in all_accounts:
            # Get sent stats
            sent_row = sent_stats[sent_stats['account_id'] == account]
            total_sent = float(sent_row['total_sent'].iloc[0]) if not sent_row.empty else 0.0
            sent_count = int(sent_row['sent_count'].iloc[0]) if not sent_row.empty else 0
            
            # Get received stats
            received_row = received_stats[received_stats['account_id'] == account]
            total_received = float(received_row['total_received'].iloc[0]) if not received_row.empty else 0.0
            received_count = int(received_row['received_count'].iloc[0]) if not received_row.empty else 0
            
            # Get degree from graph
            in_degree = self.graph.in_degree(account)
            out_degree = self.graph.out_degree(account)
            
            self._node_metrics[account] = {
                'in_degree': in_degree,
                'out_degree': out_degree,
                'total_transactions': sent_count + received_count,
                'total_amount_sent': total_sent,
                'total_amount_received': total_received,
                'net_flow': total_received - total_sent
            }
        
        logger.info(f"Calculated metrics for {len(self._node_metrics)} nodes")
    
    def get_node_metrics(self, node_id: str) -> Dict[str, Any]:
        """Get metrics for a specific node"""
        return self._node_metrics.get(node_id, {})
    
    def get_all_nodes_with_metrics(self) -> List[Dict[str, Any]]:
        """
        Get all nodes with their metrics formatted for API response.
        
        Returns:
            List of node dictionaries with id and metrics
        """
        nodes = []
        for node_id in self.graph.nodes():
            metrics = self._node_metrics.get(node_id, {})
            nodes.append({
                'id': node_id,
                'in_degree': metrics.get('in_degree', 0),
                'out_degree': metrics.get('out_degree', 0),
                'total_transactions': metrics.get('total_transactions', 0),
                'total_amount_sent': metrics.get('total_amount_sent', 0.0),
                'total_amount_received': metrics.get('total_amount_received', 0.0),
                'net_flow': metrics.get('net_flow', 0.0)
            })
        return nodes
    
    def get_all_edges_with_attributes(self) -> List[Dict[str, Any]]:
        """
        Get all edges with their attributes formatted for API response.
        
        Returns:
            List of edge dictionaries with source, target, and attributes
        """
        edges = []
        for source, target, data in self.graph.edges(data=True):
            edges.append({
                'source': source,
                'target': target,
                'amount': data.get('amount', 0.0),
                'transaction_count': data.get('transaction_count', 1)
            })
        return edges
    
    def get_graph_summary(self) -> Dict[str, Any]:
        """
        Get high-level graph statistics.
        
        Returns:
            Dictionary with graph summary stats
        """
        return {
            'total_nodes': self.graph.number_of_nodes(),
            'total_edges': self.graph.number_of_edges(),
            'is_connected': nx.is_weakly_connected(self.graph) if self.graph.number_of_nodes() > 0 else False,
            'density': nx.density(self.graph)
        }

    def export_for_visualization(self) -> Dict[str, Any]:
        """
        Export complete graph data for frontend visualization.
        
        Returns:
            Dictionary with nodes, edges, and summary
        """
        return {
            'nodes': self.get_all_nodes_with_metrics(),
            'edges': self.get_all_edges_with_attributes(),
            'summary': self.get_graph_summary()
        }
    
    def add_transactions(self, new_df: pd.DataFrame) -> Dict[str, int]:
        """
        Incrementally add new transactions to existing graph.
        
        Args:
            new_df: DataFrame with new transactions
            
        Returns:
            Dictionary with counts of new nodes and edges added
        """
        logger.info(f"Adding {len(new_df)} new transactions incrementally")
        
        # Track what was added
        initial_node_count = self.graph.number_of_nodes()
        initial_edge_count = self.graph.number_of_edges()
        
        # Extract unique accounts from new transactions
        new_accounts = pd.concat([new_df['sender_id'], new_df['receiver_id']]).unique()
        
        # Add new nodes (accounts that don't exist yet)
        existing_nodes = set(self.graph.nodes())
        new_nodes = [acc for acc in new_accounts if acc not in existing_nodes]
        self.graph.add_nodes_from(new_nodes)
        
        # Add new edges or update existing ones
        for _, row in new_df.iterrows():
            source = row['sender_id']
            target = row['receiver_id']
            amount = float(row['amount'])
            timestamp = row['timestamp']
            
            # If edge exists, accumulate amount and timestamps
            if self.graph.has_edge(source, target):
                self.graph[source][target]['amount'] += amount
                self.graph[source][target]['timestamps'].append(timestamp)
                self.graph[source][target]['transaction_count'] += 1
            else:
                # Add new edge
                self.graph.add_edge(
                    source,
                    target,
                    amount=amount,
                    timestamps=[timestamp],
                    transaction_count=1
                )
        
        # Recalculate metrics for affected nodes only
        affected_accounts = new_accounts
        self._update_node_metrics(new_df, affected_accounts)
        
        new_node_count = self.graph.number_of_nodes() - initial_node_count
        new_edge_count = self.graph.number_of_edges() - initial_edge_count
        
        logger.info(f"Added {new_node_count} new nodes, {new_edge_count} new edges")
        
        return {
            'new_nodes': new_node_count,
            'new_edges': new_edge_count,
            'total_nodes': self.graph.number_of_nodes(),
            'total_edges': self.graph.number_of_edges()
        }
    
    def _update_node_metrics(self, df: pd.DataFrame, affected_accounts: List[str]) -> None:
        """
        Update metrics for specific nodes (incremental update).
        
        Args:
            df: Complete DataFrame (all transactions)
            affected_accounts: List of account IDs to update
        """
        logger.info(f"Updating metrics for {len(affected_accounts)} affected accounts")
        
        # Calculate sent/received for affected accounts
        sent_stats = df[df['sender_id'].isin(affected_accounts)].groupby('sender_id').agg({
            'amount': ['sum', 'count']
        }).reset_index()
        sent_stats.columns = ['account_id', 'total_sent', 'sent_count']
        
        received_stats = df[df['receiver_id'].isin(affected_accounts)].groupby('receiver_id').agg({
            'amount': ['sum', 'count']
        }).reset_index()
        received_stats.columns = ['account_id', 'total_received', 'received_count']
        
        # Update metrics for each affected account
        for account in affected_accounts:
            sent_row = sent_stats[sent_stats['account_id'] == account]
            total_sent = float(sent_row['total_sent'].iloc[0]) if not sent_row.empty else 0.0
            sent_count = int(sent_row['sent_count'].iloc[0]) if not sent_row.empty else 0
            
            received_row = received_stats[received_stats['account_id'] == account]
            total_received = float(received_row['total_received'].iloc[0]) if not received_row.empty else 0.0
            received_count = int(received_row['received_count'].iloc[0]) if not received_row.empty else 0
            
            # Store metrics in node attributes
            self.graph.nodes[account]['in_degree'] = self.graph.in_degree(account)
            self.graph.nodes[account]['out_degree'] = self.graph.out_degree(account)
            self.graph.nodes[account]['total_transactions'] = sent_count + received_count
            self.graph.nodes[account]['total_sent'] = total_sent
            self.graph.nodes[account]['total_received'] = total_received
            self.graph.nodes[account]['net_flow'] = total_received - total_sent
            
            self._node_metrics[account] = {
                'in_degree': self.graph.in_degree(account),
                'out_degree': self.graph.out_degree(account),
                'total_transactions': sent_count + received_count,
                'total_sent': total_sent,
                'total_received': total_received,
                'net_flow': total_received - total_sent
            }
    
    def export_for_visualization(self) -> Dict[str, Any]:
        """
        Export graph data in format optimized for frontend visualization.
        
        Returns:
            Dictionary with nodes and edges arrays
        """
        return {
            'nodes': self.get_all_nodes_with_metrics(),
            'edges': self.get_all_edges_with_attributes(),
            'summary': self.get_graph_summary()
        }
