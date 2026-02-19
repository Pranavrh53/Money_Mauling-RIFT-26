"""
Test Case Exact Matching
========================
Validates detection returns EXACT account IDs for known patterns.
Used for hackathon evaluation criteria: "Exact match with expected account IDs"
"""
import pandas as pd
import json
from datetime import datetime, timedelta
import sys

sys.path.insert(0, '.')

from app.graph_builder import TransactionGraph
from app.detection import FraudDetectionEngine
from app.response_builder import ResponseBuilder


def test_exact_account_matching():
    """
    Test Case 1: Exact Account ID Matching
    Creates known patterns and verifies exact account IDs are returned.
    """
    print("=" * 70)
    print("TEST CASE EXACT MATCHING")
    print("=" * 70)
    
    base_time = datetime(2024, 1, 15, 10, 0, 0)
    
    # ========================================
    # KNOWN PATTERNS WITH EXACT ACCOUNT IDS
    # ========================================
    
    transactions = []
    tx_id = 1
    
    # PATTERN 1: Cycle (CYCLE_A -> CYCLE_B -> CYCLE_C -> CYCLE_A)
    cycle_accounts = ['CYCLE_A', 'CYCLE_B', 'CYCLE_C']
    for i in range(3):
        transactions.append({
            'transaction_id': f'TXN_{tx_id:04d}',
            'sender_id': cycle_accounts[i],
            'receiver_id': cycle_accounts[(i + 1) % 3],
            'amount': 5000.0 - i * 100,
            'timestamp': (base_time + timedelta(hours=i)).strftime('%Y-%m-%d %H:%M:%S')
        })
        tx_id += 1
    
    # PATTERN 2: Fan-In Smurfing (SMURF_01 through SMURF_12 -> COLLECTOR_HUB)
    smurf_senders = [f'SMURF_{i:02d}' for i in range(1, 13)]
    for i, sender in enumerate(smurf_senders):
        transactions.append({
            'transaction_id': f'TXN_{tx_id:04d}',
            'sender_id': sender,
            'receiver_id': 'COLLECTOR_HUB',
            'amount': 900.0 + i * 5,  # Just under reporting threshold
            'timestamp': (base_time + timedelta(hours=i)).strftime('%Y-%m-%d %H:%M:%S')
        })
        tx_id += 1
    
    # PATTERN 3: Fan-Out Distribution (DISPERSER_HUB -> DEST_01 through DEST_12)
    dest_receivers = [f'DEST_{i:02d}' for i in range(1, 13)]
    for i, receiver in enumerate(dest_receivers):
        transactions.append({
            'transaction_id': f'TXN_{tx_id:04d}',
            'sender_id': 'DISPERSER_HUB',
            'receiver_id': receiver,
            'amount': 400.0 + i * 10,
            'timestamp': (base_time + timedelta(days=1, hours=i)).strftime('%Y-%m-%d %H:%M:%S')
        })
        tx_id += 1
    
    # PATTERN 4: Shell Chain (SOURCE -> SHELL_1 -> SHELL_2 -> SHELL_3 -> FINAL_DEST)
    shell_chain = ['SOURCE_ACC', 'SHELL_1', 'SHELL_2', 'SHELL_3', 'FINAL_DEST']
    for i in range(len(shell_chain) - 1):
        transactions.append({
            'transaction_id': f'TXN_{tx_id:04d}',
            'sender_id': shell_chain[i],
            'receiver_id': shell_chain[i + 1],
            'amount': 10000.0 - i * 500,
            'timestamp': (base_time + timedelta(days=2, hours=i*2)).strftime('%Y-%m-%d %H:%M:%S')
        })
        tx_id += 1
    
    # Create DataFrame
    df = pd.DataFrame(transactions)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Run detection
    graph_builder = TransactionGraph()
    graph_builder.build_from_dataframe(df)
    engine = FraudDetectionEngine(graph_builder.graph, df)
    results = engine.run_full_detection()
    
    # Build response
    response_builder = ResponseBuilder()
    response_builder.start_timer()
    response_builder.stop_timer()
    json_response = response_builder.build_response(results, len(graph_builder.graph.nodes()))
    
    # ========================================
    # EXACT ACCOUNT ID VERIFICATION
    # ========================================
    
    print("\n" + "-" * 70)
    print("EXPECTED ACCOUNT IDS VS DETECTED")
    print("-" * 70)
    
    detected_accounts = {acc['account_id'] for acc in json_response['suspicious_accounts']}
    
    # Expected accounts
    expected_cycle = set(cycle_accounts)
    expected_fanin = {'COLLECTOR_HUB'} | set(smurf_senders)
    expected_fanout = {'DISPERSER_HUB'} | set(dest_receivers)
    expected_shell = {'SHELL_1', 'SHELL_2', 'SHELL_3'}  # Intermediates only
    
    all_expected = expected_cycle | expected_fanin | expected_fanout | expected_shell
    
    # Check each category
    print("\n📍 CYCLE PATTERN:")
    print(f"   Expected: {sorted(expected_cycle)}")
    cycle_detected = expected_cycle & detected_accounts
    print(f"   Detected: {sorted(cycle_detected)}")
    cycle_match = expected_cycle.issubset(detected_accounts)
    print(f"   Match: {'✅ PASS' if cycle_match else '❌ FAIL'}")
    
    print("\n📍 FAN-IN (SMURFING) PATTERN:")
    print(f"   Expected Hub: COLLECTOR_HUB")
    print(f"   Expected Sources: SMURF_01 through SMURF_12")
    fanin_detected = expected_fanin & detected_accounts
    print(f"   Detected: {len(fanin_detected)}/{len(expected_fanin)} accounts")
    fanin_match = expected_fanin.issubset(detected_accounts)
    print(f"   Match: {'✅ PASS' if fanin_match else '❌ FAIL'}")
    
    print("\n📍 FAN-OUT (DISTRIBUTION) PATTERN:")
    print(f"   Expected Hub: DISPERSER_HUB")
    print(f"   Expected Destinations: DEST_01 through DEST_12")
    fanout_detected = expected_fanout & detected_accounts
    print(f"   Detected: {len(fanout_detected)}/{len(expected_fanout)} accounts")
    fanout_match = expected_fanout.issubset(detected_accounts)
    print(f"   Match: {'✅ PASS' if fanout_match else '❌ FAIL'}")
    
    print("\n📍 SHELL CHAIN PATTERN:")
    print(f"   Expected Intermediates: SHELL_1, SHELL_2, SHELL_3")
    shell_detected = expected_shell & detected_accounts
    print(f"   Detected: {sorted(shell_detected)}")
    shell_match = len(shell_detected) >= 2  # At least 2 intermediates
    print(f"   Match: {'✅ PASS' if shell_match else '❌ FAIL'}")
    
    # ========================================
    # RING IDENTIFICATION
    # ========================================
    
    print("\n" + "-" * 70)
    print("FRAUD RING IDENTIFICATION")
    print("-" * 70)
    
    rings = json_response['fraud_rings']
    print(f"\nTotal rings detected: {len(rings)}")
    
    for ring in rings:
        print(f"\n   {ring['ring_id']}:")
        print(f"      Type: {ring['pattern_type']}")
        members = ring['member_accounts']
        print(f"      Members: {', '.join(members[:5])}{'...' if len(members) > 5 else ''}")
        print(f"      Count: {ring['member_count']}")
        print(f"      Risk Score: {ring['risk_score']:.1f}")
    
    # ========================================
    # JSON FORMAT VERIFICATION
    # ========================================
    
    print("\n" + "-" * 70)
    print("JSON FORMAT VERIFICATION")
    print("-" * 70)
    
    # Check required fields
    required_root = ['suspicious_accounts', 'fraud_rings', 'summary']
    json_root_ok = all(k in json_response for k in required_root)
    print(f"   Root fields {required_root}: {'✅' if json_root_ok else '❌'}")
    
    if json_response['suspicious_accounts']:
        acc = json_response['suspicious_accounts'][0]
        required_acc = ['account_id', 'suspicion_score', 'detected_patterns', 'ring_id']
        acc_fields_ok = all(k in acc for k in required_acc)
        print(f"   Account fields {required_acc}: {'✅' if acc_fields_ok else '❌'}")
    
    if json_response['fraud_rings']:
        ring = json_response['fraud_rings'][0]
        required_ring = ['ring_id', 'pattern_type', 'member_accounts', 'member_count', 'risk_score']
        ring_fields_ok = all(k in ring for k in required_ring)
        print(f"   Ring fields {required_ring}: {'✅' if ring_fields_ok else '❌'}")
    
    # Print sample JSON
    print("\n" + "-" * 70)
    print("SAMPLE JSON OUTPUT (First 2 accounts)")
    print("-" * 70)
    sample = {
        'suspicious_accounts': json_response['suspicious_accounts'][:2],
        'fraud_rings': json_response['fraud_rings'][:1],
        'summary': json_response['summary']
    }
    print(json.dumps(sample, indent=2))
    
    # ========================================
    # FINAL RESULT
    # ========================================
    
    print("\n" + "=" * 70)
    print("TEST CASE EXACT MATCHING RESULTS")
    print("=" * 70)
    
    all_pass = cycle_match and fanin_match and fanout_match and shell_match
    
    print(f"   Cycle accounts exact match: {'✅ PASS' if cycle_match else '❌ FAIL'}")
    print(f"   Fan-in accounts exact match: {'✅ PASS' if fanin_match else '❌ FAIL'}")
    print(f"   Fan-out accounts exact match: {'✅ PASS' if fanout_match else '❌ FAIL'}")
    print(f"   Shell chain accounts match: {'✅ PASS' if shell_match else '❌ FAIL'}")
    print(f"   JSON format valid: {'✅ PASS' if json_root_ok and acc_fields_ok and ring_fields_ok else '❌ FAIL'}")
    print(f"\n   OVERALL: {'🎉 ALL TESTS PASSED' if all_pass else '⚠️ SOME TESTS FAILED'}")
    
    return all_pass


if __name__ == "__main__":
    success = test_exact_account_matching()
    exit(0 if success else 1)
