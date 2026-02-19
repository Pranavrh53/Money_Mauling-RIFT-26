# Fraud Detection Engine Documentation

## Overview
Production-grade money muling detection system using graph analysis and temporal pattern recognition. Processes up to 10,000 transactions in under 30 seconds.

---

## Detection Algorithms

### 1. Circular Fund Routing (Cycle Detection)

**Purpose:** Detect money returning to original account through intermediaries.

**Algorithm:** NetworkX `simple_cycles()` with bounded length (3-5 nodes)

**Logic:**
```
A → B → C → A (cycle length 3)
A → B → C → D → A (cycle length 4)
```

**Complexity:** O(V + E) for bounded cycles
- V = number of accounts (vertices)
- E = number of transaction edges

**Parameters:**
- `min_length = 3`: Minimum cycle size
- `max_length = 5`: Maximum cycle size (prevents pathological cases)

**Scoring Impact:** +40 points per account in cycle

**Why This Matters:**
Circular routing is a strong indicator of money laundering. Legitimate transactions rarely form perfect loops.

---

### 2. Smurfing Detection (Fan-In / Fan-Out)

**Purpose:** Detect structuring patterns where funds are split or aggregated to avoid detection thresholds.

#### Fan-In Pattern (Collection Phase)
```
Sender1 ─┐
Sender2 ─┤
Sender3 ─┼──→ Collector Account
  ...    │
Sender10─┘
```

**Logic:**
- 10+ unique senders → 1 receiver
- All transactions within 72-hour window
- Indicates collection of illicit funds

#### Fan-Out Pattern (Distribution Phase)
```
                  ┌─→ Receiver1
                  ├─→ Receiver2
Hub Account ──────┼─→ Receiver3
                  │     ...
                  └─→ Receiver10
```

**Logic:**
- 1 sender → 10+ unique receivers
- Within 72-hour window
- Indicates rapid distribution (layering)

**Algorithm:**
1. Sort transactions by timestamp: O(n log n)
2. Group by sender/receiver: O(n)
3. Sliding window scan: O(n)

**Total Complexity:** O(n log n)

**Parameters:**
- `threshold = 10`: Minimum number of counterparties
- `time_window_hours = 72`: Detection window

**Scoring Impact:**
- Fan-in hub: +30 points
- Fan-out hub: +30 points

**False Positive Control:**
- Time window prevents coincidental patterns
- High threshold (10) filters normal business activity
- Legitimate payroll/merchant transactions typically don't cluster this tightly

---

### 3. Shell Network Detection (Layered Chains)

**Purpose:** Detect chains of low-activity intermediary accounts used to obscure money trail.

**Pattern:**
```
Source → Shell1 → Shell2 → Shell3 → Destination
```

**Characteristics of Shell Accounts:**
- Total degree ≤ 3 (low activity)
- Sequential timestamps (monotonic increase)
- Act as pass-through intermediaries

**Algorithm:**
1. BFS traversal from each active node
2. Track path and timestamps
3. Validate intermediates have low degree
4. Check temporal ordering
5. Deduplicate overlapping chains

**Complexity:** O(V × k) where k = average degree (typically small)

**Parameters:**
- `min_length = 3`: Minimum chain length
- `max_degree = 3`: Maximum total degree for intermediates

**Scoring Impact:** +20 points per intermediate node

**Why Low Degree Matters:**
Real accounts have diverse transaction patterns. Shell accounts exist solely to move money between two points.

---

## Suspicion Scoring System

### Score Range: 0-100

### Base Scoring:
| Pattern | Points | Rationale |
|---------|--------|-----------|
| Cycle member | +40 | Strongest indicator |
| Fan-in hub | +30 | Collection phase |
| Fan-out hub | +30 | Distribution phase |
| Shell intermediate | +20 | Obscuration tactic |

### Multipliers:

**Velocity Multiplier (1.0 - 2.0x):**
- Rapid consecutive transactions (< 24 hours apart)
- Formula: `1 + (rapid_count × 0.1)`
- Rationale: Speed indicates urgency to move illicit funds

**Example:**
```
Base score: 40 (cycle member)
Rapid transactions: 3
Multiplier: 1.3x
Final: 40 × 1.3 = 52
```

### Penalties:

**Spread Over Time (-30%):**
- Transactions spread over 7+ days
- Low transaction volume (< 20 total)
- Multiplier: 0.7x
- Rationale: Legitimate accounts have regular, spread-out activity

### Risk Levels:
- **HIGH:** Score ≥ 70 (immediate investigation)
- **MEDIUM:** Score 40-69 (enhanced monitoring)
- **LOW:** Score < 40 (routine monitoring)

### Score Capping:
All scores capped at 100 to prevent overflow from multiple patterns.

---

## Fraud Ring Construction

### Definition:
Group of accounts involved in coordinated fraudulent activity.

### Ring Types:

1. **Cycle Rings:**
   - All members of detected cycle
   - High confidence (obvious coordination)

2. **Smurfing Rings:**
   - Hub + all counterparties
   - Indicates organized structuring

3. **Shell Chains:**
   - All accounts in detected chain
   - Source + intermediaries + destination

### Ring Metadata:
```python
{
    'ring_id': 'RING_001',
    'pattern_type': 'cycle',
    'member_accounts': ['ACC001', 'ACC002', 'ACC003'],
    'member_count': 3,
    'risk_score': 67.5,  # Average of member scores
    'description': 'Circular fund routing through 3 accounts'
}
```

### Prioritization:
Rings sorted by `risk_score` (highest first) for investigation workflow.

---

## Performance Analysis

### Complexity Breakdown:

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Precomputation | O(V + E) | One-time cost |
| Cycle detection | O((V+E) × C) | C = bounded cycles |
| Smurfing detection | O(n log n) | Sorting dominant |
| Shell chains | O(V × k) | k = avg degree (~3) |
| Scoring | O(V + n) | Linear scan |
| Ring construction | O(R) | R = patterns found |

**Overall:** O(n log n + V×E)

### Benchmarks (10,000 transactions, ~1,000 accounts):

| Hardware | Estimated Time |
|----------|----------------|
| Laptop (i5, 8GB) | 3-5 seconds |
| Server (Xeon, 32GB) | 1-2 seconds |

### Optimizations Implemented:

1. **Precomputed Degree Maps:**
   - Avoid repeated `graph.degree()` calls
   - O(1) lookup vs O(V) scan

2. **Sorted DataFrame:**
   - Enable O(n) sliding window
   - Prevent O(n²) nested loops

3. **Bounded Cycle Length:**
   - Limit search space
   - Focus on relevant patterns

4. **Early Termination:**
   - Stop chain growth at reasonable length
   - Prevent exponential explosion

5. **Deduplication:**
   - Remove redundant chains
   - Reduce result set size

---

## False Positive Control Strategy

### 1. Time-Window Constraints
**Problem:** Coincidental patterns in large datasets
**Solution:** 72-hour window for smurfing
**Impact:** Filters unrelated transactions

### 2. Threshold Requirements
**Problem:** Normal business activity looks suspicious
**Solution:** 10+ counterparties for fan patterns
**Impact:** Legitimate payroll (typically < 10 at once) excluded

### 3. Degree Limits
**Problem:** Active accounts flagged as shells
**Solution:** Shell accounts must have degree ≤ 3
**Impact:** Merchants and exchanges excluded

### 4. Temporal Ordering
**Problem:** Chains picked up from unrelated transactions
**Solution:** Sequential timestamps required
**Impact:** Only genuine pass-through chains detected

### 5. Score Penalties
**Problem:** Long-standing accounts flagged
**Solution:** -30% penalty for spread-out activity
**Impact:** Rewards consistent behavior

### 6. Multiple Pattern Confirmation
**Problem:** Single anomaly causes high score
**Solution:** Additive scoring requires multiple flags
**Impact:** One-off events don't trigger HIGH risk

---

## API Usage

### 1. Upload Transaction Data
```bash
POST /upload
Content-Type: multipart/form-data
Body: CSV file
```

### 2. Run Fraud Detection
```bash
POST /detect-fraud

Response:
{
  "suspicious_accounts": [
    {
      "account_id": "ACC001",
      "score": 82.5,
      "risk_level": "HIGH",
      "factors": ["cycle_member", "velocity_x1.3"],
      "patterns": ["cycle", "fan_out"]
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "pattern_type": "cycle",
      "member_accounts": ["ACC001", "ACC002", "ACC003"],
      "member_count": 3,
      "risk_score": 75.0,
      "description": "Circular fund routing through 3 accounts"
    }
  ],
  "detection_summary": {
    "cycles_detected": 1,
    "fanin_detected": 2,
    "fanout_detected": 1,
    "chains_detected": 3,
    "total_rings": 7,
    "high_risk_accounts": 5,
    "medium_risk_accounts": 12
  }
}
```

---

## Interpretation Guide

### High Priority Alerts

**HIGH Risk (Score ≥ 70):**
- Immediate investigation required
- Multiple patterns detected
- Strong evidence of coordination

**Action Items:**
1. Review transaction history
2. Check account ownership
3. Escalate to compliance team
4. Consider filing SAR (Suspicious Activity Report)

### Medium Priority

**MEDIUM Risk (Score 40-69):**
- Enhanced monitoring
- Single pattern or edge case
- May be legitimate with explanation

**Action Items:**
1. Request additional documentation
2. Monitor for 30 days
3. Re-run detection after new data

### Pattern Types

**Cycle:**
- Definitive evidence of coordination
- Rarely has legitimate explanation
- Highest confidence

**Fan-In:**
- Could be crowdfunding, payment aggregation
- Check account type (merchant vs personal)
- Investigate if personal account

**Fan-Out:**
- Could be payroll, affiliate payments
- Check regularity and amounts
- Investigate if irregular patterns

**Shell Chain:**
- Deliberate obfuscation
- Check intermediate account activity
- Strong indicator if minimal other transactions

---

## Limitations

### Current Scope:
✅ Pattern detection  
✅ Risk scoring  
✅ Ring identification  

### Not Included (Future Work):
❌ Machine learning models  
❌ Historical fraud database  
❌ Real-time streaming detection  
❌ Cross-institutional analysis  
❌ Geographic risk factors  
❌ Industry-specific rules  

### Known Edge Cases:

1. **Legitimate Marketplaces:**
   - Escrow services create fan patterns
   - **Mitigation:** Whitelist known platforms

2. **Payroll Systems:**
   - Fan-out from employer accounts
   - **Mitigation:** Check regularity and description fields

3. **Crypto Exchanges:**
   - High-degree hubs are normal
   - **Mitigation:** Identify exchange hot wallets

4. **Family/Business Partnerships:**
   - Cycles may exist for legitimate reasons
   - **Mitigation:** Context from KYC data

---

## Testing Recommendations

### Test Cases:

1. **Perfect Cycle (A→B→C→A):**
   - Expected: HIGH risk, cycle pattern
   - Score: ≥70

2. **Fan-Out (1→20 in 24h):**
   - Expected: MEDIUM-HIGH risk
   - Score: 40-60 (depends on velocity)

3. **Shell Chain (A→S1→S2→S3→B, shells have degree 2):**
   - Expected: MEDIUM risk for shells
   - Score: 30-50

4. **Normal Activity (spread over 30 days, diverse partners):**
   - Expected: LOW risk or no detection
   - Score: <20

5. **Mixed Pattern (cycle + fan-out):**
   - Expected: HIGH risk, multiple patterns
   - Score: 70-100

### Performance Test:
```bash
# Generate 10K transaction CSV
python generate_test_data.py --count 10000

# Upload and time detection
time curl -X POST http://localhost:8000/detect-fraud

# Expected: < 30 seconds
```

---

## Maintenance & Tuning

### Adjustable Parameters:

| Parameter | Default | Impact | Tuning Guide |
|-----------|---------|--------|--------------|
| Fan threshold | 10 | Smurfing sensitivity | ↑ = fewer false positives |
| Time window | 72h | Pattern tightness | ↓ = stricter detection |
| Shell degree | 3 | Chain sensitivity | ↓ = stricter shells |
| Cycle length | 3-5 | Cycle types | ↑ max = more complex cycles |

### Monitoring Metrics:

1. **Detection Rate:**
   - % of transactions flagged
   - Target: 1-5% for normal data

2. **False Positive Rate:**
   - Requires manual review labels
   - Target: <10% after tuning

3. **Processing Time:**
   - Track p50, p95, p99 latencies
   - Alert if > 30s

4. **Pattern Distribution:**
   - Histogram of pattern types
   - Identifies data biases

---

## Production Deployment Checklist

- [ ] Configure logging (INFO level minimum)
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Implement rate limiting on API endpoints
- [ ] Add authentication/authorization
- [ ] Replace in-memory storage with Redis/database
- [ ] Tune parameters based on pilot data
- [ ] Create alerting rules for HIGH risk accounts
- [ ] Document escalation procedures
- [ ] Train compliance team on interpretation
- [ ] Set up scheduled re-detection (daily/weekly)
- [ ] Implement audit trail for investigations
- [ ] Create dashboard for visualization

---

## Contact & Support

For questions about detection logic, scoring, or integration:
- Review this documentation
- Check algorithm comments in `detection.py`
- Analyze sample data with debug logging enabled

## License
Production-grade code for financial crime detection. Use responsibly and in compliance with local regulations.
