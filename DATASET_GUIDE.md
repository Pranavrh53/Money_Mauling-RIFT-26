# Fraud Patterns Dataset - Detection Guide

## Dataset: fraud_patterns_dataset.csv

This dataset is specifically designed to trigger ALL fraud detection types in the Money Muling Detection System.

---

## 🔄 CYCLE PATTERNS (Circular Routing)

### Pattern 1: 3-Node Cycle
**Accounts:** ACC_001 → ACC_002 → ACC_003 → ACC_001
- **Transactions:** TXN_001, TXN_002, TXN_003
- **Date:** Jan 15, 2024 (10:00-12:00)
- **Flow:** $5000 → $4800 → $4600 (loss through fees)

### Pattern 2: 4-Node Cycle  
**Accounts:** ACC_010 → ACC_011 → ACC_012 → ACC_013 → ACC_010
- **Transactions:** TXN_004, TXN_005, TXN_006, TXN_007
- **Date:** Jan 16, 2024 (09:00-12:00)
- **Flow:** $3000 → $2900 → $2800 → $2700

### Pattern 3: 5-Node Cycle
**Accounts:** ACC_020 → ACC_021 → ACC_022 → ACC_023 → ACC_024 → ACC_020
- **Transactions:** TXN_008-TXN_012
- **Date:** Jan 17, 2024 (08:00-12:00)
- **Flow:** $8000 → $7800 → $7600 → $7400 → $7200

### Pattern 4: 3-Node Cycle (Small)
**Accounts:** ACC_030 → ACC_031 → ACC_032 → ACC_030
- **Transactions:** TXN_055, TXN_056, TXN_057
- **Date:** Jan 15, 2024 (14:00-16:00)

### Pattern 5: 4-Node Cycle
**Accounts:** ACC_040 → ACC_041 → ACC_042 → ACC_043 → ACC_040
- **Transactions:** TXN_058-TXN_061
- **Date:** Jan 16, 2024 (14:00-17:00)

### Pattern 6: 4-Node Cycle
**Accounts:** ACC_050 → ACC_051 → ACC_052 → ACC_053 → ACC_050
- **Transactions:** TXN_065-TXN_068
- **Date:** Jan 17, 2024 (14:00-17:00)

### Pattern 7: 3-Node Cycle
**Accounts:** ACC_060 → ACC_061 → ACC_062 → ACC_060
- **Transactions:** TXN_075, TXN_076, TXN_077
- **Date:** Jan 18, 2024 (14:00-16:00)

**Total Cycles: 7 patterns** (mix of 3, 4, and 5-node cycles)

---

## 📥 FAN-IN PATTERNS (Smurfing Collection)

### Major Hub: ACC_200
**Collecting from 20 UNIQUE senders within 10 hours!**

| Sender | Amount | Time | Transaction |
|--------|--------|------|-------------|
| ACC_100 | $1,500 | 10:00 | TXN_013 |
| ACC_101 | $1,200 | 10:30 | TXN_014 |
| ACC_102 | $1,800 | 11:00 | TXN_015 |
| ACC_103 | $900 | 11:30 | TXN_016 |
| ACC_104 | $1,100 | 12:00 | TXN_017 |
| ACC_105 | $1,300 | 12:30 | TXN_018 |
| ACC_106 | $1,600 | 13:00 | TXN_019 |
| ACC_107 | $1,400 | 13:30 | TXN_020 |
| ACC_108 | $1,000 | 14:00 | TXN_021 |
| ACC_109 | $1,700 | 14:30 | TXN_022 |
| ACC_110 | $950 | 15:00 | TXN_023 |
| ACC_111 | $1,250 | 15:30 | TXN_024 |
| ACC_112 | $1,450 | 16:00 | TXN_025 |
| ACC_113 | $1,050 | 16:30 | TXN_026 |
| ACC_114 | $1,350 | 17:00 | TXN_027 |
| ACC_115 | $1,150 | 17:30 | TXN_062 |
| ACC_116 | $1,550 | 18:00 | TXN_063 |
| ACC_117 | $850 | 18:30 | TXN_064 |
| ACC_118 | $1,650 | 19:00 | TXN_083 |
| ACC_119 | $750 | 19:30 | TXN_084 |

- **Date:** Jan 18, 2024
- **Time Window:** 10:00-19:30 (9.5 hours - well within 72h threshold)
- **Total Amount Collected:** ~$25,500
- **Detection:** 20 unique senders → 10+ threshold = DETECTED ✅

---

## 📤 FAN-OUT PATTERNS (Smurfing Distribution)

### Major Hub: ACC_300
**Distributing to 19 UNIQUE receivers within 4.5 hours!**

| Receiver | Amount | Time | Transaction |
|----------|--------|------|-------------|
| ACC_400 | $800 | 09:00 | TXN_028 |
| ACC_401 | $850 | 09:15 | TXN_029 |
| ACC_402 | $900 | 09:30 | TXN_030 |
| ACC_403 | $750 | 09:45 | TXN_031 |
| ACC_404 | $950 | 10:00 | TXN_032 |
| ACC_405 | $700 | 10:15 | TXN_033 |
| ACC_406 | $1,000 | 10:30 | TXN_034 |
| ACC_407 | $650 | 10:45 | TXN_035 |
| ACC_408 | $1,100 | 11:00 | TXN_036 |
| ACC_409 | $600 | 11:15 | TXN_037 |
| ACC_410 | $1,050 | 11:30 | TXN_038 |
| ACC_411 | $750 | 11:45 | TXN_039 |
| ACC_412 | $900 | 12:00 | TXN_040 |
| ACC_413 | $850 | 12:15 | TXN_041 |
| ACC_414 | $950 | 12:30 | TXN_042 |
| ACC_415 | $800 | 12:45 | TXN_070 |
| ACC_416 | $900 | 13:00 | TXN_071 |
| ACC_417 | $1,050 | 13:15 | TXN_085 |
| ACC_418 | $700 | 13:30 | TXN_086 |

- **Date:** Jan 19, 2024
- **Time Window:** 09:00-13:30 (4.5 hours - well within 72h threshold)
- **Total Amount Distributed:** ~$16,250
- **Detection:** 19 unique receivers → 10+ threshold = DETECTED ✅

---

## 🔗 SHELL CHAIN PATTERNS (Layered Transfers)

### Chain 1: Length 3
**ACC_500 → ACC_501 → ACC_502 → ACC_503**
- **Transactions:** TXN_043, TXN_044, TXN_045
- **Date:** Jan 20, 2024
- **Flow:** $10,000 → $9,500 → $9,000
- **Pattern:** Sequential transfers with gradual amount reduction

### Chain 2: Length 4
**ACC_600 → ACC_601 → ACC_602 → ACC_603 → ACC_604**
- **Transactions:** TXN_046-TXN_049
- **Date:** Jan 21, 2024
- **Flow:** $5,000 → $4,500 → $4,000 → $3,500
- **Pattern:** Linear chain with significant drops

### Chain 3: Length 5
**ACC_700 → ACC_701 → ACC_702 → ACC_703 → ACC_704 → ACC_705**
- **Transactions:** TXN_050-TXN_054
- **Date:** Jan 22, 2024
- **Flow:** $3,000 → $2,800 → $2,600 → $2,400 → $2,200
- **Pattern:** Long chain with consistent amount decay

### Chain 4: Length 3
**ACC_800 → ACC_801 → ACC_802 → ACC_803**
- **Transactions:** TXN_072-TXN_074
- **Date:** Jan 23, 2024
- **Flow:** $2,000 → $1,800 → $1,600
- **Connected to:** ACC_200 (fan-in hub sent $15k to ACC_800)

### Chain 5: Length 5
**ACC_900 → ACC_901 → ACC_902 → ACC_903 → ACC_904 → ACC_905**
- **Transactions:** TXN_078-TXN_082
- **Date:** Jan 24, 2024
- **Flow:** $7,000 → $6,500 → $6,000 → $5,500 → $5,000
- **Pattern:** Longest chain with steady degradation

**Total Shell Chains: 5 patterns** (lengths 3-5 hops)

---

## ✅ NORMAL TRANSACTIONS (Control Group)

**Accounts:** NORM_001 through NORM_008
- **Transactions:** TXN_087-TXN_090
- **Pattern:** Simple one-time P2P transfers
- **Purpose:** Baseline normal activity (should NOT be flagged)

---

## 📊 EXPECTED DETECTION RESULTS

When you upload this dataset and run fraud detection, you should see:

### Summary Statistics
- **Total Accounts Analyzed:** ~120 unique accounts
- **Suspicious Accounts Flagged:** ~50-60 accounts
- **Fraud Rings Detected:** ~12-15 rings
- **Processing Time:** < 3 seconds

### Pattern Breakdown
- ✅ **Cycles:** 7 detected (3, 4, and 5-node cycles)
- ✅ **Fan-In:** 1 major hub (ACC_200 with 20 senders)
- ✅ **Fan-Out:** 1 major hub (ACC_300 with 19 receivers)
- ✅ **Shell Chains:** 5 chains (3-5 hops each)

### High-Risk Accounts (Expected)
- **ACC_200** - Fan-in hub (20 incoming connections)
- **ACC_300** - Fan-out hub (19 outgoing connections)
- **ACC_001, ACC_002, ACC_003** - 3-node cycle participants
- **ACC_020-ACC_024** - 5-node cycle participants
- **ACC_500, ACC_501, ACC_502** - Shell chain operators

### Fraud Rings
Each detected pattern will be grouped as a separate ring:
- **RING_001-RING_007:** Cycle-based rings
- **RING_008:** Fan-in ring centered on ACC_200
- **RING_009:** Fan-out ring centered on ACC_300
- **RING_010-RING_014:** Shell chain rings

---

## 🎯 HOW TO USE

1. **Upload the file:**
   - Go to http://localhost:3002
   - Drag & drop `fraud_patterns_dataset.csv` or click to upload

2. **View graph:**
   - See the transaction network visualization
   - Notice the dense connections around ACC_200 and ACC_300

3. **Run detection:**
   - Click "🔍 Run Fraud Detection"
   - Wait 2-3 seconds for analysis

4. **Explore results:**
   - View summary cards (total suspicious accounts, rings)
   - Expand fraud rings table to see members
   - Check pattern badges (🔄 cycle, 📥 fan-in, 📤 fan-out, 🔗 shell)
   - View risk scores (CRITICAL/HIGH/MEDIUM)

5. **Download JSON:**
   - Click "Download JSON Results"
   - Examine the exact formatted output with precise decimal values

---

## 🔍 TESTING CHECKLIST

- [ ] All 7 cycles detected
- [ ] ACC_200 flagged as fan-in hub (20 senders)
- [ ] ACC_300 flagged as fan-out hub (19 receivers)
- [ ] All 5 shell chains detected
- [ ] NORM_* accounts NOT flagged as suspicious
- [ ] JSON download has exact field order and decimal precision
- [ ] Expandable table rows work correctly
- [ ] Pattern badges display with correct icons and colors
- [ ] Risk scores show appropriate levels (CRITICAL/HIGH/MEDIUM)
- [ ] Processing time displayed in summary (should be < 3 seconds)

---

## 💡 DATA CHARACTERISTICS

- **Time Range:** Jan 15-25, 2024 (10 days)
- **Total Transactions:** 90
- **Unique Accounts:** ~120
- **Fraudulent Patterns:** 4 types across 20+ instances
- **Normal Transactions:** 4 (control group)
- **Amount Range:** $600 - $15,000
- **Realistic:** Includes transaction fees/losses in cycles and chains
