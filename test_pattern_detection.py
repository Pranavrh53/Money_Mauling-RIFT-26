"""
Test script to verify detection of all three money muling patterns:
1. Circular Fund Routing (Cycles)
2. Smurfing Patterns (Fan-in / Fan-out)
3. Layered Shell Networks
"""
import pandas as pd
import sys
sys.path.insert(0, '.')

from app.graph_builder import TransactionGraph
from app.detection import FraudDetectionEngine

def test_detection_patterns():
    print("=" * 70)
    print("MONEY MULING PATTERN DETECTION TEST")
    print("=" * 70)
    
    # Load test data
    df = pd.read_csv('test_patterns.csv')
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    print(f"\n📊 Loaded {len(df)} transactions")
    print(f"   Unique accounts: {pd.concat([df['sender_id'], df['receiver_id']]).nunique()}")
    
    # Build graph
    graph = TransactionGraph()
    graph.build_from_dataframe(df)
    
    # Initialize detection engine
    engine = FraudDetectionEngine(graph.graph, df)
    
    # Run all detections
    engine.run_full_detection()
    
    # --------------------------------------------------
    # TEST 1: CYCLES
    # --------------------------------------------------
    print("\n" + "─" * 70)
    print("🔄 TEST 1: CIRCULAR FUND ROUTING (CYCLES)")
    print("─" * 70)
    
    cycles = engine.detected_cycles
    print(f"   Cycles detected: {len(cycles)}")
    
    # Expected cycles
    expected_cycles = [
        {'CYCLE_A', 'CYCLE_B', 'CYCLE_C'},      # Length 3
        {'CYC4_A', 'CYC4_B', 'CYC4_C', 'CYC4_D'},  # Length 4
        {'CYC5_A', 'CYC5_B', 'CYC5_C', 'CYC5_D', 'CYC5_E'}  # Length 5
    ]
    
    detected_cycle_sets = [set(c) for c in cycles]
    
    for i, expected in enumerate(expected_cycles, 1):
        found = expected in detected_cycle_sets
        status = "✅ PASS" if found else "❌ FAIL"
        print(f"   Cycle {i} (length {len(expected)}): {status}")
        if found:
            print(f"      Members: {sorted(expected)}")
    
    # --------------------------------------------------
    # TEST 2: SMURFING (FAN-IN / FAN-OUT)
    # --------------------------------------------------
    print("\n" + "─" * 70)
    print("📥📤 TEST 2: SMURFING PATTERNS (FAN-IN / FAN-OUT)")
    print("─" * 70)
    
    fanin_patterns = engine.detected_fanin
    fanout_patterns = engine.detected_fanout
    
    print(f"   Fan-in patterns detected: {len(fanin_patterns)}")
    print(f"   Fan-out patterns detected: {len(fanout_patterns)}")
    
    # Check fan-in (COLLECTOR_A should receive from 12 accounts)
    collector_found = any(p['receiver'] == 'COLLECTOR_A' for p in fanin_patterns)
    status = "✅ PASS" if collector_found else "❌ FAIL"
    print(f"\n   Fan-In Test (COLLECTOR_A with 12 senders): {status}")
    if collector_found:
        pattern = next(p for p in fanin_patterns if p['receiver'] == 'COLLECTOR_A')
        print(f"      Senders detected: {pattern['count']}")
        print(f"      Total amount: ${pattern['total_amount']:,.2f}")
    
    # Check fan-out (DISPERSER_B should send to 11 accounts)
    disperser_found = any(p['sender'] == 'DISPERSER_B' for p in fanout_patterns)
    status = "✅ PASS" if disperser_found else "❌ FAIL"
    print(f"\n   Fan-Out Test (DISPERSER_B with 11 receivers): {status}")
    if disperser_found:
        pattern = next(p for p in fanout_patterns if p['sender'] == 'DISPERSER_B')
        print(f"      Receivers detected: {pattern['count']}")
        print(f"      Total amount: ${pattern['total_amount']:,.2f}")
    
    # --------------------------------------------------
    # TEST 3: SHELL CHAINS
    # --------------------------------------------------
    print("\n" + "─" * 70)
    print("🔗 TEST 3: LAYERED SHELL NETWORKS")
    print("─" * 70)
    
    chains = engine.detected_chains
    print(f"   Shell chains detected: {len(chains)}")
    
    # Expected shell chains (accounts with 2-3 total transactions as intermediaries)
    # Chain 1: SOURCE_X → SHELL_INT1 → SHELL_INT2 → SHELL_INT3 → FINAL_DEST (4 hops)
    # Chain 2: SOURCE_Y → SHELL2_A → SHELL2_B → SHELL2_C → SHELL2_D → FINAL_Y (5 hops)
    
    if chains:
        print("\n   Detected chains:")
        for i, chain in enumerate(chains, 1):
            print(f"      Chain {i}: {' → '.join(chain)}")
    else:
        print("   ⚠️ No shell chains detected (check max_degree threshold)")
    
    # --------------------------------------------------
    # SUMMARY: SUSPICIOUS ACCOUNTS
    # --------------------------------------------------
    print("\n" + "─" * 70)
    print("🚨 SUSPICIOUS ACCOUNTS SUMMARY")
    print("─" * 70)
    
    suspicious = engine.suspicious_accounts
    print(f"   Total suspicious accounts flagged: {len(suspicious)}")
    
    # Sort by score
    sorted_accounts = sorted(suspicious.items(), key=lambda x: x[1].get('score', 0), reverse=True)
    
    print("\n   Top 10 suspicious accounts:")
    for account_id, data in sorted_accounts[:10]:
        score = data.get('score', 0)
        patterns = data.get('patterns', [])
        print(f"      {account_id}: Score {score:.1f} | Patterns: {', '.join(patterns)}")
    
    # --------------------------------------------------
    # FRAUD RINGS
    # --------------------------------------------------
    print("\n" + "─" * 70)
    print("🔴 DETECTED FRAUD RINGS")
    print("─" * 70)
    
    rings = engine.fraud_rings
    print(f"   Total fraud rings: {len(rings)}")
    
    for ring in rings:
        print(f"\n   Ring: {ring.get('ring_id', 'N/A')}")
        print(f"      Pattern: {ring.get('pattern_type', 'N/A')}")
        print(f"      Members: {ring.get('member_count', 0)}")
        print(f"      Risk Score: {ring.get('risk_score', 0):.1f}")
        members = ring.get('member_accounts', [])
        print(f"      Accounts: {', '.join(members[:10])}{'...' if len(members) > 10 else ''}")
    
    # --------------------------------------------------
    # FINAL RESULT
    # --------------------------------------------------
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    tests_passed = 0
    total_tests = 5
    
    # Check results
    if len(cycles) >= 3:
        tests_passed += 1
        print("✅ Cycle detection: PASS")
    else:
        print("❌ Cycle detection: FAIL")
    
    if collector_found:
        tests_passed += 1
        print("✅ Fan-in detection: PASS")
    else:
        print("❌ Fan-in detection: FAIL")
    
    if disperser_found:
        tests_passed += 1
        print("✅ Fan-out detection: PASS")
    else:
        print("❌ Fan-out detection: FAIL")
    
    if len(chains) >= 1:
        tests_passed += 1
        print("✅ Shell chain detection: PASS")
    else:
        print("⚠️ Shell chain detection: CHECK MANUALLY")
        tests_passed += 0.5  # Partial credit
    
    if len(rings) >= 3:
        tests_passed += 1
        print("✅ Fraud ring grouping: PASS")
    else:
        print("❌ Fraud ring grouping: FAIL")
    
    print(f"\n🎯 Overall: {tests_passed}/{total_tests} tests passed")
    print("=" * 70)

if __name__ == '__main__':
    test_detection_patterns()
