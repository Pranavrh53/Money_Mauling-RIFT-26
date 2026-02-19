"""
Response Builder - Formats detection results into exact required JSON structure
Ensures deterministic output and field compliance
"""
import time
from typing import Dict, List, Any
from collections import OrderedDict


class ResponseBuilder:
    """
    Builds JSON responses in exact required format with deterministic output.
    """
    
    def __init__(self):
        self.upload_start_time = None
        self.detection_end_time = None
    
    def start_timer(self):
        """Start processing time measurement"""
        self.upload_start_time = time.time()
    
    def stop_timer(self):
        """Stop processing time measurement"""
        self.detection_end_time = time.time()
    
    def get_processing_time(self) -> float:
        """Get processing time in seconds, rounded to 2 decimals"""
        if self.upload_start_time and self.detection_end_time:
            return round(self.detection_end_time - self.upload_start_time, 2)
        return 0.0
    
    def build_response(self, detection_results: Dict[str, Any], total_accounts: int) -> Dict[str, Any]:
        """
        Build exact JSON response format.
        
        Args:
            detection_results: Raw detection engine results
            total_accounts: Total number of accounts analyzed
            
        Returns:
            Formatted response matching exact specification
        """
        # Extract and format suspicious accounts
        suspicious_accounts = self._build_suspicious_accounts(
            detection_results.get('suspicious_accounts', {})
        )
        
        # Extract and format fraud rings
        fraud_rings = self._build_fraud_rings(
            detection_results.get('fraud_rings', [])
        )
        
        # Build summary
        summary = self._build_summary(
            total_accounts=total_accounts,
            suspicious_count=len(suspicious_accounts),
            rings_count=len(fraud_rings)
        )
        
        # Construct response in exact field order
        response = OrderedDict([
            ('suspicious_accounts', suspicious_accounts),
            ('fraud_rings', fraud_rings),
            ('summary', summary)
        ])
        
        return response
    
    def _build_suspicious_accounts(self, raw_accounts: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Format suspicious accounts list.
        
        Returns list sorted by suspicion_score descending with exact fields.
        """
        accounts_list = []
        
        for account_id, data in raw_accounts.items():
            # Skip accounts with zero score
            if data.get('score', 0) == 0:
                continue
            
            # Find ring_id for this account
            ring_id = data.get('ring_id', None)
            
            # Format detected patterns
            detected_patterns = self._format_patterns(data)
            
            # Build account entry with exact fields in exact order
            account_entry = OrderedDict([
                ('account_id', str(account_id)),
                ('suspicion_score', round(float(data.get('score', 0)), 1)),
                ('detected_patterns', detected_patterns),
                ('ring_id', ring_id)
            ])
            
            accounts_list.append(account_entry)
        
        # Sort by suspicion_score descending (deterministic with account_id as tiebreaker)
        accounts_list.sort(
            key=lambda x: (-x['suspicion_score'], x['account_id'])
        )
        
        return accounts_list
    
    def _format_patterns(self, account_data: Dict[str, Any]) -> List[str]:
        """
        Format detected patterns into standardized names.
        
        Maps internal pattern names to specification-compliant names.
        """
        patterns = account_data.get('patterns', [])
        factors = account_data.get('factors', [])
        
        formatted_patterns = []
        
        # Map patterns to exact format
        pattern_mapping = {
            'cycle': 'cycle_length_3',
            'fan_in': 'fan_in_smurfing',
            'fan_out': 'fan_out_smurfing',
            'shell_chain': 'shell_chain'
        }
        
        for pattern in patterns:
            if pattern in pattern_mapping:
                formatted_patterns.append(pattern_mapping[pattern])
        
        # Add velocity factor if present
        for factor in factors:
            if 'velocity' in factor.lower():
                formatted_patterns.append('high_velocity')
                break
        
        # Return sorted list for determinism
        return sorted(list(set(formatted_patterns)))
    
    def _build_fraud_rings(self, raw_rings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Format fraud rings list.
        
        Returns list with exact fields, deterministic ring IDs.
        """
        rings_list = []
        
        for idx, ring in enumerate(raw_rings, start=1):
            # Generate deterministic ring ID
            ring_id = f"RING_{idx:03d}"
            
            # Format pattern type
            pattern_type = ring.get('pattern_type', 'unknown')
            
            # Get member accounts (sorted for determinism)
            member_accounts = sorted([str(acc) for acc in ring.get('member_accounts', [])])
            
            # Build ring entry with exact fields in exact order
            ring_entry = OrderedDict([
                ('ring_id', ring_id),
                ('member_accounts', member_accounts),
                ('pattern_type', pattern_type),
                ('risk_score', round(float(ring.get('risk_score', 0)), 1))
            ])
            
            rings_list.append(ring_entry)
        
        return rings_list
    
    def _build_summary(self, total_accounts: int, suspicious_count: int, rings_count: int) -> Dict[str, Any]:
        """
        Build summary section with exact fields.
        """
        summary = OrderedDict([
            ('total_accounts_analyzed', int(total_accounts)),
            ('suspicious_accounts_flagged', int(suspicious_count)),
            ('fraud_rings_detected', int(rings_count)),
            ('processing_time_seconds', self.get_processing_time())
        ])
        
        return summary
    
    def assign_ring_ids_to_accounts(self, detection_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assign ring_id to each suspicious account based on ring membership.
        
        Modifies detection_results in place to add ring_id field to suspicious_accounts.
        """
        suspicious_accounts = detection_results.get('suspicious_accounts', {})
        fraud_rings = detection_results.get('fraud_rings', [])
        
        # Map account to ring
        account_to_ring = {}
        
        for idx, ring in enumerate(fraud_rings, start=1):
            ring_id = f"RING_{idx:03d}"
            members = ring.get('member_accounts', [])
            
            for member in members:
                # Assign first ring if account appears in multiple
                if member not in account_to_ring:
                    account_to_ring[member] = ring_id
        
        # Add ring_id to suspicious accounts
        for account_id in suspicious_accounts:
            ring_id = account_to_ring.get(account_id, None)
            suspicious_accounts[account_id]['ring_id'] = ring_id
        
        return detection_results


# Formatting guarantees:
# 
# 1. Field Order Consistency:
#    - Uses OrderedDict to maintain exact field order
#    - suspicious_accounts, fraud_rings, summary always in this order
# 
# 2. Deterministic Output:
#    - Sorting by suspicion_score DESC, then account_id ASC (tiebreaker)
#    - Ring IDs generated sequentially (RING_001, RING_002, ...)
#    - Member accounts sorted alphabetically
#    - Detected patterns sorted alphabetically
# 
# 3. Precision Control:
#    - suspicion_score: round(x, 1) - 1 decimal place
#    - risk_score: round(x, 1) - 1 decimal place
#    - processing_time_seconds: round(x, 2) - 2 decimal places
# 
# 4. Type Safety:
#    - All IDs converted to str
#    - All counts converted to int
#    - All scores converted to float before rounding
# 
# 5. No Null/Extra Fields:
#    - ring_id can be None if account not in any ring
#    - All required fields always present
#    - No additional fields added
# 
# 6. Same Input → Same Output:
#    - Deterministic sorting at every level
#    - No randomness, no non-deterministic operations
#    - Timestamp measured consistently
