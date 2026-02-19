"""
Exact-match validation test suite for fraud_patterns_dataset.csv

Validates:
1. All 7 known cycles are detected with exact account IDs
2. Shell chains are detected
3. Merchant (ACC_200) and payroll (ACC_300) are NOT flagged
4. Normal accounts (NORM_*) are NOT flagged
5. JSON output has all required fields and correct structure
6. Deterministic ordering constraints hold
7. Processing completes within 30 seconds
"""
import sys
import os
import time
import json
import pytest
import pandas as pd

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.graph_builder import TransactionGraph
from app.detection import FraudDetectionEngine
from app.response_builder import ResponseBuilder

DATASET_PATH = os.path.join(os.path.dirname(__file__), '..', 'fraud_patterns_dataset.csv')


# ─── Fixtures ──────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def pipeline():
    """Run the full detection pipeline once, share results across all tests."""
    df = pd.read_csv(DATASET_PATH)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['amount'] = df['amount'].astype(float)

    tg = TransactionGraph()
    tg.build_from_dataframe(df)

    rb = ResponseBuilder()
    rb.start_timer()

    detector = FraudDetectionEngine(tg.graph, df)
    raw = detector.run_full_detection()

    rb.stop_timer()

    # Assign ring IDs and build formatted JSON
    rb.assign_ring_ids_to_accounts(raw)
    formatted = rb.build_response(raw, total_accounts=len(tg.graph.nodes()))

    return {
        'detector': detector,
        'raw': raw,
        'formatted': formatted,
        'processing_time': rb.get_processing_time(),
        'df': df,
        'graph': tg.graph,
    }


# ─── 1. Cycle Detection: exact account IDs ────────────────────────

# All 7 expected cycles as sorted-tuples (cycle comparison is order-agnostic)
EXPECTED_CYCLES = [
    {"ACC_001", "ACC_002", "ACC_003"},
    {"ACC_010", "ACC_011", "ACC_012", "ACC_013"},
    {"ACC_020", "ACC_021", "ACC_022", "ACC_023", "ACC_024"},
    {"ACC_030", "ACC_031", "ACC_032"},
    {"ACC_040", "ACC_041", "ACC_042", "ACC_043"},
    {"ACC_050", "ACC_051", "ACC_052", "ACC_053"},
    {"ACC_060", "ACC_061", "ACC_062"},
]


def test_cycle_count(pipeline):
    """Exactly 7 cycles must be detected."""
    assert len(pipeline['detector'].detected_cycles) == 7, (
        f"Expected 7 cycles, got {len(pipeline['detector'].detected_cycles)}"
    )


def test_cycle_membership(pipeline):
    """Each expected cycle must appear (set comparison, order-agnostic)."""
    detected_sets = [set(c) for c in pipeline['detector'].detected_cycles]
    for expected in EXPECTED_CYCLES:
        assert expected in detected_sets, (
            f"Missing cycle: {sorted(expected)}. Detected: {[sorted(s) for s in detected_sets]}"
        )


def test_no_extra_cycles(pipeline):
    """No unexpected cycles should be detected."""
    detected_sets = [set(c) for c in pipeline['detector'].detected_cycles]
    for detected in detected_sets:
        assert detected in EXPECTED_CYCLES, (
            f"Unexpected cycle detected: {sorted(detected)}"
        )


# ─── 2. Shell Chain Detection ─────────────────────────────────────

SHELL_CHAIN_STARTER_ACCOUNTS = {"ACC_500", "ACC_600", "ACC_700", "ACC_800", "ACC_900"}


def test_shell_chains_detected(pipeline):
    """Shell chains must be detected (non-zero count)."""
    assert len(pipeline['detector'].detected_chains) > 0, "No shell chains detected"


def test_shell_chain_known_starters(pipeline):
    """Chains starting from known shell-chain source accounts must be found."""
    chain_starters = {chain[0] for chain in pipeline['detector'].detected_chains}
    for starter in SHELL_CHAIN_STARTER_ACCOUNTS:
        assert starter in chain_starters, (
            f"No shell chain starting from {starter}. Starters found: {sorted(chain_starters)}"
        )


def test_shell_chain_min_length(pipeline):
    """Every detected chain must have length >= 3."""
    for chain in pipeline['detector'].detected_chains:
        assert len(chain) >= 3, f"Chain too short ({len(chain)}): {chain}"


# ─── 3. False Positive Control ────────────────────────────────────

def test_merchant_not_flagged(pipeline):
    """ACC_200 (merchant) must NOT appear as suspicious (score == 0 or absent)."""
    susp = pipeline['formatted']['suspicious_accounts']
    flagged_ids = {a['account_id'] for a in susp}
    assert "ACC_200" not in flagged_ids, "ACC_200 (merchant) was incorrectly flagged!"


def test_payroll_not_flagged(pipeline):
    """ACC_300 (payroll) must NOT appear as suspicious (score == 0 or absent)."""
    susp = pipeline['formatted']['suspicious_accounts']
    flagged_ids = {a['account_id'] for a in susp}
    assert "ACC_300" not in flagged_ids, "ACC_300 (payroll) was incorrectly flagged!"


def test_merchant_whitelisted(pipeline):
    """ACC_200 must be in the whitelisted set."""
    assert "ACC_200" in pipeline['detector'].whitelisted_accounts, (
        f"ACC_200 not whitelisted. Whitelisted: {pipeline['detector'].whitelisted_accounts}"
    )


def test_payroll_whitelisted(pipeline):
    """ACC_300 must be in the whitelisted set."""
    assert "ACC_300" in pipeline['detector'].whitelisted_accounts, (
        f"ACC_300 not whitelisted. Whitelisted: {pipeline['detector'].whitelisted_accounts}"
    )


def test_normal_accounts_not_flagged(pipeline):
    """NORM_001 through NORM_008 must NOT be flagged."""
    susp = pipeline['formatted']['suspicious_accounts']
    flagged_ids = {a['account_id'] for a in susp}
    norm_accounts = {f"NORM_{i:03d}" for i in range(1, 9)}
    flagged_norms = flagged_ids & norm_accounts
    assert len(flagged_norms) == 0, (
        f"Normal accounts incorrectly flagged: {sorted(flagged_norms)}"
    )


# ─── 4. Cycle account IDs must be flagged as suspicious ───────────

CYCLE_ACCOUNTS = set()
for c in EXPECTED_CYCLES:
    CYCLE_ACCOUNTS.update(c)


def test_cycle_accounts_are_suspicious(pipeline):
    """Every account that is part of a cycle must appear in suspicious_accounts."""
    susp = pipeline['formatted']['suspicious_accounts']
    flagged_ids = {a['account_id'] for a in susp}
    missing = CYCLE_ACCOUNTS - flagged_ids
    assert len(missing) == 0, (
        f"Cycle accounts missing from suspicious list: {sorted(missing)}"
    )


def test_cycle_accounts_have_cycle_pattern(pipeline):
    """Cycle accounts must have 'cycle_length_3' in their detected_patterns."""
    susp = pipeline['formatted']['suspicious_accounts']
    for acc in susp:
        if acc['account_id'] in CYCLE_ACCOUNTS:
            assert 'cycle_length_3' in acc['detected_patterns'], (
                f"{acc['account_id']} is in a cycle but has patterns: {acc['detected_patterns']}"
            )


# ─── 5. JSON Format Compliance ────────────────────────────────────

def test_json_top_level_keys(pipeline):
    """JSON must have exactly three top-level keys."""
    keys = set(pipeline['formatted'].keys())
    expected_keys = {'suspicious_accounts', 'fraud_rings', 'summary'}
    assert keys == expected_keys, f"Top-level keys: {keys}, expected: {expected_keys}"


def test_suspicious_account_fields(pipeline):
    """Each suspicious account must have exactly the required fields."""
    required = {'account_id', 'suspicion_score', 'detected_patterns', 'ring_id'}
    for acc in pipeline['formatted']['suspicious_accounts']:
        assert set(acc.keys()) == required, (
            f"Account {acc.get('account_id')} has fields {set(acc.keys())}, expected {required}"
        )


def test_fraud_ring_fields(pipeline):
    """Each fraud ring must have exactly the required fields."""
    required = {'ring_id', 'member_accounts', 'pattern_type', 'risk_score'}
    for ring in pipeline['formatted']['fraud_rings']:
        assert set(ring.keys()) == required, (
            f"Ring {ring.get('ring_id')} has fields {set(ring.keys())}, expected {required}"
        )


def test_summary_fields(pipeline):
    """Summary must have exactly the required fields."""
    required = {'total_accounts_analyzed', 'suspicious_accounts_flagged',
                'fraud_rings_detected', 'processing_time_seconds'}
    assert set(pipeline['formatted']['summary'].keys()) == required, (
        f"Summary fields: {set(pipeline['formatted']['summary'].keys())}, expected: {required}"
    )


def test_json_serializable(pipeline):
    """The entire response must be JSON-serializable."""
    try:
        json_str = json.dumps(pipeline['formatted'], default=str)
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)
    except (TypeError, ValueError) as e:
        pytest.fail(f"Response is not JSON-serializable: {e}")


def test_ring_id_format(pipeline):
    """Ring IDs must match RING_NNN format."""
    import re
    for ring in pipeline['formatted']['fraud_rings']:
        assert re.match(r'^RING_\d{3}$', ring['ring_id']), (
            f"Invalid ring_id format: {ring['ring_id']}"
        )


def test_suspicion_score_range(pipeline):
    """All suspicion scores must be in [0, 100]."""
    for acc in pipeline['formatted']['suspicious_accounts']:
        assert 0 <= acc['suspicion_score'] <= 100, (
            f"{acc['account_id']} has out-of-range score: {acc['suspicion_score']}"
        )


def test_member_accounts_sorted(pipeline):
    """Member accounts within each ring must be sorted alphabetically."""
    for ring in pipeline['formatted']['fraud_rings']:
        members = ring['member_accounts']
        assert members == sorted(members), (
            f"{ring['ring_id']} members not sorted: {members}"
        )


def test_suspicious_accounts_sorted(pipeline):
    """Suspicious accounts must be sorted by score DESC, then account_id ASC."""
    accounts = pipeline['formatted']['suspicious_accounts']
    for i in range(len(accounts) - 1):
        a, b = accounts[i], accounts[i + 1]
        assert (a['suspicion_score'] > b['suspicion_score'] or
                (a['suspicion_score'] == b['suspicion_score'] and
                 a['account_id'] <= b['account_id'])), (
            f"Sort violation: {a['account_id']}({a['suspicion_score']}) "
            f"before {b['account_id']}({b['suspicion_score']})"
        )


# ─── 6. Determinism ───────────────────────────────────────────────

def test_deterministic_output(pipeline):
    """Running detection twice on the same data must produce identical JSON."""
    df = pipeline['df']
    tg = TransactionGraph()
    tg.build_from_dataframe(df)

    rb2 = ResponseBuilder()
    rb2.start_timer()
    detector2 = FraudDetectionEngine(tg.graph, df)
    raw2 = detector2.run_full_detection()
    rb2.stop_timer()
    rb2.assign_ring_ids_to_accounts(raw2)
    formatted2 = rb2.build_response(raw2, total_accounts=len(tg.graph.nodes()))

    # Compare account IDs and scores (ignore processing_time)
    orig_accs = [
        (a['account_id'], a['suspicion_score'])
        for a in pipeline['formatted']['suspicious_accounts']
    ]
    new_accs = [
        (a['account_id'], a['suspicion_score'])
        for a in formatted2['suspicious_accounts']
    ]
    assert orig_accs == new_accs, "Suspicious accounts differ between runs"

    orig_rings = [
        (r['ring_id'], r['member_accounts'], r['pattern_type'])
        for r in pipeline['formatted']['fraud_rings']
    ]
    new_rings = [
        (r['ring_id'], r['member_accounts'], r['pattern_type'])
        for r in formatted2['fraud_rings']
    ]
    assert orig_rings == new_rings, "Fraud rings differ between runs"


# ─── 7. Performance ───────────────────────────────────────────────

def test_processing_time_under_30s(pipeline):
    """Total processing must complete in under 30 seconds."""
    assert pipeline['processing_time'] < 30.0, (
        f"Processing took {pipeline['processing_time']:.2f}s — exceeds 30s limit"
    )


# ─── 8. Summary Statistics ────────────────────────────────────────

def test_total_accounts_count(pipeline):
    """Total accounts analyzed must match unique accounts in dataset."""
    expected = pipeline['df'][['sender_id', 'receiver_id']].stack().nunique()
    assert pipeline['formatted']['summary']['total_accounts_analyzed'] == expected, (
        f"Expected {expected} accounts, got {pipeline['formatted']['summary']['total_accounts_analyzed']}"
    )


def test_suspicious_count_matches(pipeline):
    """Summary suspicious count must match length of suspicious_accounts list."""
    count = pipeline['formatted']['summary']['suspicious_accounts_flagged']
    actual = len(pipeline['formatted']['suspicious_accounts'])
    assert count == actual, f"Summary says {count}, but list has {actual} accounts"


def test_rings_count_matches(pipeline):
    """Summary rings count must match length of fraud_rings list."""
    count = pipeline['formatted']['summary']['fraud_rings_detected']
    actual = len(pipeline['formatted']['fraud_rings'])
    assert count == actual, f"Summary says {count}, but list has {actual} rings"


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
