"""End-to-end performance validation against hackathon requirements."""
import time
import requests
import json

BASE = "http://localhost:8000"

print("=" * 60)
print("PERFORMANCE REQUIREMENT VALIDATION")
print("=" * 60)

# 1. Upload dataset
print("\n--- UPLOAD ---")
t0 = time.time()
with open("fraud_patterns_dataset.csv", "rb") as f:
    resp = requests.post(f"{BASE}/upload", files={"file": ("fraud_patterns_dataset.csv", f, "text/csv")})
t1 = time.time()
assert resp.status_code == 200, f"Upload failed: {resp.text}"
upload = resp.json()
print(f"  Upload time: {t1-t0:.2f}s")
print(f"  Transactions: {upload['total_transactions']}, Accounts: {upload['unique_accounts']}")

# 2. Detect fraud
print("\n--- FRAUD DETECTION ---")
t2 = time.time()
resp2 = requests.post(f"{BASE}/detect-fraud")
t3 = time.time()
assert resp2.status_code == 200, f"Detection failed: {resp2.text}"
fraud = resp2.json()
print(f"  Detection time: {t3-t2:.2f}s")
total_time = t3 - t0
print(f"  TOTAL (upload -> results): {total_time:.2f}s")

# Requirement 1: Processing Time <= 30 seconds
print(f"\n[REQ 1] Processing Time <= 30s: {'PASS' if total_time <= 30 else 'FAIL'} ({total_time:.2f}s)")

# 3. Analyze detection quality
suspicious = fraud.get("suspicious_accounts", [])
rings = fraud.get("fraud_rings", [])
summary = fraud.get("detection_summary", {})

print(f"\n--- DETECTION RESULTS ---")
print(f"  Suspicious accounts: {len(suspicious)}")
print(f"  Fraud rings: {len(rings)}")
print(f"  Cycles: {summary.get('cycles_detected', 0)}")
print(f"  Fan-in: {summary.get('fanin_detected', 0)}")
print(f"  Fan-out: {summary.get('fanout_detected', 0)}")
print(f"  Chains: {summary.get('chains_detected', 0)}")
print(f"  High risk: {summary.get('high_risk_accounts', 0)}")
print(f"  Medium risk: {summary.get('medium_risk_accounts', 0)}")

# 4. FALSE POSITIVE CHECK - Merchants/Payroll
print("\n--- FALSE POSITIVE CONTROL ---")
flagged_ids = {a["account_id"]: a for a in suspicious}

# Known legitimate patterns in fraud_patterns_dataset.csv:
# ACC_200: receives from 20 unique senders (merchant-like)
# ACC_300: sends to 18+ unique receivers (payroll-like)
fp_pass = True
for check_id, account_type in [("ACC_200", "MERCHANT"), ("ACC_300", "PAYROLL")]:
    if check_id in flagged_ids:
        score = flagged_ids[check_id]["score"]
        if score > 0:
            print(f"  FAIL: {check_id} ({account_type}) flagged with score {score}")
            fp_pass = False
        else:
            print(f"  OK: {check_id} ({account_type}) score=0 (whitelisted)")
    else:
        print(f"  OK: {check_id} ({account_type}) NOT in suspicious list")

print(f"\n[REQ 4] No false-flagging merchants/payroll: {'PASS' if fp_pass else 'FAIL'}")

# 5. Check known fraud patterns are detected (recall)
# Known cycles in dataset: ACC_001-002-003, ACC_010-011-012-013, ACC_020-024, etc.
known_fraud_accounts = {
    "ACC_001", "ACC_002", "ACC_003",  # Cycle 1
    "ACC_010", "ACC_011", "ACC_012", "ACC_013",  # Cycle 2
    "ACC_020", "ACC_021", "ACC_022", "ACC_023", "ACC_024",  # Cycle 3
    "ACC_030", "ACC_031", "ACC_032",  # Cycle 4
    "ACC_040", "ACC_041", "ACC_042", "ACC_043",  # Cycle 5
    "ACC_050", "ACC_051", "ACC_052", "ACC_053",  # Cycle 6
    "ACC_060", "ACC_061", "ACC_062",  # Cycle 7
}

detected_fraud_accounts = set(flagged_ids.keys())
true_positives = known_fraud_accounts & detected_fraud_accounts
false_negatives = known_fraud_accounts - detected_fraud_accounts

recall = len(true_positives) / len(known_fraud_accounts) if known_fraud_accounts else 0
print(f"\n--- RECALL ANALYSIS ---")
print(f"  Known fraud accounts: {len(known_fraud_accounts)}")
print(f"  Detected: {len(true_positives)}")
print(f"  Missed: {len(false_negatives)} -> {false_negatives}")
print(f"  Recall: {recall:.1%}")
print(f"\n[REQ 3] Recall >= 60%: {'PASS' if recall >= 0.60 else 'FAIL'} ({recall:.1%})")

# 6. Precision estimate
# Non-fraud accounts (NORM_* accounts + whitelisted)
known_legit = {"NORM_001", "NORM_002", "NORM_003", "NORM_004", 
               "NORM_005", "NORM_006", "NORM_007", "NORM_008",
               "ACC_200", "ACC_300"}
false_positives_set = detected_fraud_accounts & known_legit
true_positives_all = detected_fraud_accounts - known_legit  # Approximate

if len(detected_fraud_accounts) > 0:
    precision = (len(detected_fraud_accounts) - len(false_positives_set)) / len(detected_fraud_accounts)
else:
    precision = 1.0

print(f"\n--- PRECISION ANALYSIS ---")
print(f"  Total flagged: {len(detected_fraud_accounts)}")
print(f"  False positives (legit flagged): {len(false_positives_set)} -> {false_positives_set}")
print(f"  Estimated precision: {precision:.1%}")
print(f"\n[REQ 2] Precision >= 70%: {'PASS' if precision >= 0.70 else 'FAIL'} ({precision:.1%})")

# 7. Download results check
print("\n--- JSON DOWNLOAD ---")
resp3 = requests.get(f"{BASE}/download-results")
assert resp3.status_code == 200
dl = resp3.json()
assert "suspicious_accounts" in dl
assert "fraud_rings" in dl
assert "summary" in dl
pt = dl["summary"].get("processing_time_seconds", 0)
print(f"  Processing time in JSON: {pt}s")
print(f"  Suspicious in JSON: {len(dl['suspicious_accounts'])}")
print(f"  Rings in JSON: {len(dl['fraud_rings'])}")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"  [1] Processing Time <= 30s:    {'PASS' if total_time <= 30 else 'FAIL'} ({total_time:.2f}s)")
print(f"  [2] Precision >= 70%:          {'PASS' if precision >= 0.70 else 'FAIL'} ({precision:.1%})")
print(f"  [3] Recall >= 60%:             {'PASS' if recall >= 0.60 else 'FAIL'} ({recall:.1%})")
print(f"  [4] No merchant/payroll FP:    {'PASS' if fp_pass else 'FAIL'}")
print("=" * 60)
