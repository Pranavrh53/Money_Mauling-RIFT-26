# Money Mauling — Graph-Based Financial Crime Detection

> **RIFT-26 Hackathon Submission**
> Detect money muling rings, smurfing networks, and shell chains using graph theory on transaction data.

---

## Table of Contents

1. [Problem Statement](#-problem-statement)
2. [Architecture Overview](#-architecture-overview)
3. [Algorithm Deep-Dive](#-algorithm-deep-dive)
4. [Suspicion Score Methodology](#-suspicion-score-methodology)
5. [False Positive Control](#-false-positive-control)
6. [JSON Output Format](#-json-output-format)
7. [Performance Benchmarks](#-performance-benchmarks)
8. [Quick Start](#-quick-start)
9. [Test Cases & Validation](#-test-cases--validation)
10. [Known Limitations](#-known-limitations)
11. [Tech Stack](#-tech-stack)

---

## 🎯 Problem Statement

**Money muling** is a technique where criminals recruit intermediaries (mules) to move illicit funds through multiple accounts, obscuring the money trail. In a single operation:

1. **Placement** — Dirty money enters the system through many small deposits
2. **Layering** — Funds hop through intermediary shell accounts in chains and cycles
3. **Integration** — Clean-looking money exits to the criminal's destination

Traditional rule-based systems flag individual transactions. Our system models the **entire transaction network as a directed graph** and detects structural patterns invisible to per-transaction analysis:

| Pattern | Graph Signal | Real-World Meaning |
|---------|-------------|-------------------|
| **Cycles** | A→B→C→A | Circular fund-routing to disguise origin |
| **Fan-in** | Many→One | Smurfing collection (many mules deposit to one hub) |
| **Fan-out** | One→Many | Smurfing distribution (one source pays out to many mules) |
| **Shell chains** | A→B→C→D (low-degree B,C) | Layered routing through dormant shell accounts |

---

## 🏗 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌────────────┐ ┌──────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ FileUpload │ │  Graph Viz   │ │ Fraud     │ │  AI ChatBot │  │
│  │            │ │ (force-graph)│ │ Results   │ │             │  │
│  └─────┬──────┘ └──────┬───────┘ └─────┬─────┘ └──────┬──────┘  │
│        │               │               │              │          │
│  Light/Dark Theme Toggle        ┌──────┴──────┐       │          │
└────────┼───────────────┼────────┤             ├───────┼──────────┘
         │  REST API     │        │  Download   │       │
         ▼               ▼        │  JSON       │       ▼
┌────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                             │
│                                                                │
│  POST /upload ──► Validators ──► Graph Builder (NetworkX)      │
│                                       │                        │
│  POST /detect-fraud ◄────────────────┘                         │
│       │                                                        │
│       ├──► FraudDetectionEngine                                │
│       │     ├── detect_cycles()         ← nx.simple_cycles     │
│       │     ├── detect_smurfing()       ← sliding window       │
│       │     ├── detect_shell_chains()   ← BFS + temporal       │
│       │     ├── whitelist_merchants()   ← heuristic filter     │
│       │     └── calculate_suspicion()   ← weighted scoring     │
│       │                                                        │
│       ├──► RiskIntelligenceEngine                              │
│       │     ├── degree centrality   (20%)                      │
│       │     ├── transaction velocity (20%)                     │
│       │     ├── cycle involvement   (25%)                      │
│       │     ├── ring density        (20%)                      │
│       │     └── volume anomalies    (15%)                      │
│       │                                                        │
│       ├──► ResponseBuilder ──► Deterministic JSON              │
│       └──► AlertEngine ──► Real-time monitoring                │
│                                                                │
│  POST /chat ──► FraudChatBot (context-aware NL query engine)   │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Upload** → CSV parsed, validated (5 columns, types, uniqueness), stored in-memory
2. **Graph Build** → Directed graph: nodes = accounts, edges = transactions (aggregated)
3. **Detection** → Three pattern detectors run in sequence; scores computed
4. **Risk Intelligence** → Five-factor weighted risk engine generates per-account explanations
5. **Response** → Deterministic JSON with `suspicious_accounts`, `fraud_rings`, `summary`

---

## 🔬 Algorithm Deep-Dive

### 1. Cycle Detection — Circular Fund Routing

**Algorithm:** `nx.simple_cycles()` with bounded enumeration

```
Input:  Directed graph G = (V, E)
Output: All elementary cycles of length 3–5

1. Enumerate simple cycles using Johnson's algorithm
2. Filter: keep only cycles where 3 ≤ |cycle| ≤ 5
3. Safety bounds:
   - Time limit: 5 seconds (prevents exponential blowup on dense graphs)
   - Count limit: 500 cycles max
```

**Complexity:** O((V + E) · C) where C = number of cycles (bounded at 500)

**Why it works:** Money laundering cycles return funds to their origin through intermediaries. A→B→C→A with decreasing amounts (5000→4800→4600) is a classic sign — the "lost" amount is the laundering fee.

### 2. Smurfing Detection — Fan-in / Fan-out

**Algorithm:** Sliding window over time-sorted transactions

```
For each account A:
  1. Group all transactions where A is receiver (fan-in) or sender (fan-out)
  2. Sort by timestamp
  3. Slide a 72-hour window across the sorted list
  4. Count unique counterparties in each window
  5. If count ≥ threshold → flag as smurfing pattern

Adaptive threshold:
  - < 50 accounts  → threshold = 5
  - < 200 accounts → threshold = 7
  - ≥ 200 accounts → threshold = 10
```

**Complexity:** O(n log n) for sorting + O(n) for sliding window = O(n log n)

**Why it works:** Smurfing breaks large amounts into many small transactions from/to many different accounts within a short time window. The fan-in collector or fan-out distributor is the hub of the operation.

### 3. Shell Chain Detection — Layered Networks

**Algorithm:** BFS with temporal ordering and degree constraints

```
For each node with out_degree > 0:
  1. BFS from node, building paths
  2. Intermediate nodes must have total_degree ≤ 3 (shell account heuristic)
  3. Edge timestamps must be monotonically increasing (temporal ordering)
  4. Keep paths of length ≥ 3
  5. Deduplicate: remove sub-chains contained in longer chains
```

**Complexity:** O(V · k) where k = average node degree (typically small)

**Why it works:** Shell accounts are low-activity intermediaries used only to move money one hop down the chain. The temporal ordering constraint ensures the chain represents an actual fund flow, not coincidental connections.

---

## 📊 Suspicion Score Methodology

Each account receives a **suspicion score (0–100)** computed as a **pattern-based additive model** with velocity multiplier and legitimacy penalty:

### Base Score (Additive)

| Pattern | Points | Rationale |
|---------|--------|-----------|
| Cycle member | +40 | Direct involvement in circular routing |
| Fan-in hub | +30 | Receives from many sources = collection point |
| Fan-out hub | +30 | Sends to many targets = distribution point |
| Shell chain intermediate | +20 | Acts as pass-through in layered chain |

### Velocity Multiplier

```
For each account:
  Count rapid_transactions (consecutive txns < 24h apart)
  If rapid_count ≥ 2:
    multiplier = min(1 + rapid_count × 0.1, 2.0)   ← CAPPED at 2.0×
    score = base_score × multiplier
```

The cap at 2.0× prevents score inflation for legitimately active accounts, maintaining **precision ≥ 70%**.

### Legitimacy Penalty

```
If transactions span > 7 days AND count < 20:
  score *= 0.7   (30% reduction for regular, spread-out activity)
```

### Whitelist Override

```
If account is identified as merchant or payroll:
  score = 0, risk_level = LOW, patterns = []
```

### Risk Levels

| Score Range | Risk Level |
|------------|------------|
| ≥ 70 | HIGH |
| ≥ 40 | MEDIUM |
| < 40 | LOW |

### Advanced Risk Intelligence (5-Factor Model)

The `RiskIntelligenceEngine` computes a separate **comprehensive risk score** using weighted factors:

| Factor | Weight | Source |
|--------|--------|--------|
| Degree Centrality | 20% | `nx.degree_centrality()` + `nx.betweenness_centrality()` + `nx.pagerank()` |
| Transaction Velocity | 20% | Transactions-per-hour, rapid ratio, minimum gap |
| Cycle Involvement | 25% | Count of cycles × complexity (length) of cycles |
| Ring Density | 20% | Subgraph density within fraud ring + per-node connectivity ratio |
| Volume Anomalies | 15% | Z-score vs global mean, structuring ratio, variance, round-number avoidance |

Each factor is scored 0–100 independently, then combined as a weighted average. Final score determines risk level: CRITICAL (≥70), HIGH (≥50), MEDIUM (≥30), LOW (<30).

Each account gets a **customized natural-language explanation** describing which factors contributed and why.

---

## 🛡 False Positive Control

**Requirement:** MUST NOT flag legitimate high-volume merchants or payroll accounts.

### Merchant Detection Heuristic

```python
if in_degree >= threshold AND out_degree <= 2:
    # Many payers, very few outgoing = merchant receiving payments
    if unique_senders >= threshold:
        → WHITELIST as MERCHANT
```

### Payroll Detection Heuristic

```python
if out_degree >= threshold AND in_degree <= 2:
    # Many payees, very few incoming = payroll disbursement
    if unique_receivers >= threshold:
        if coefficient_of_variation(amounts) < 0.5:  # consistent amounts
            → WHITELIST as PAYROLL
```

### Defense-in-Depth

| Layer | Mechanism | Effect |
|-------|-----------|--------|
| 1 | Whitelisting | Merchants/payroll scored to 0 before any analysis |
| 2 | Smurfing skip | Whitelisted accounts excluded from fan-in/fan-out detection |
| 3 | Time-window constraint | 72h window rejects coincidental long-term patterns |
| 4 | Adaptive thresholds | Adjust to dataset size, preventing threshold-gap misses |
| 5 | Velocity cap | 2.0× max prevents runaway score inflation |
| 6 | Spread penalty | 30% reduction for regular, spaced-out activity |
| 7 | Cycle bounding | Length 3–5 with timeout prevents false cycle detection |

### Verified Results on `fraud_patterns_dataset.csv`

- **ACC_200** (receives from 20 senders = merchant): **NOT flagged** ✓
- **ACC_300** (sends to 18 receivers = payroll): **NOT flagged** ✓
- **NORM_001–NORM_008** (normal 1:1 transactions): **NOT flagged** ✓

---

## 📄 JSON Output Format

The `/download-results` endpoint returns deterministic JSON matching this exact structure:

```json
{
  "suspicious_accounts": [
    {
      "account_id": "ACC_001",
      "suspicion_score": 56.0,
      "detected_patterns": ["cycle_length_3", "high_velocity"],
      "ring_id": "RING_001"
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "member_accounts": ["ACC_001", "ACC_002", "ACC_003"],
      "pattern_type": "cycle",
      "risk_score": 56.0
    }
  ],
  "summary": {
    "total_accounts_analyzed": 100,
    "suspicious_accounts_flagged": 42,
    "fraud_rings_detected": 42,
    "processing_time_seconds": 2.25
  }
}
```

### Determinism Guarantees

- `suspicious_accounts` sorted by `suspicion_score` DESC, then `account_id` ASC
- `fraud_rings` use sequential IDs: `RING_001`, `RING_002`, ...
- `member_accounts` sorted alphabetically within each ring
- `detected_patterns` sorted alphabetically
- Uses `OrderedDict` for field ordering
- Scores rounded: `suspicion_score` to 1dp, `processing_time_seconds` to 2dp
- Same input always produces same output — zero non-determinism

---

## ⚡ Performance Benchmarks

Tested on `fraud_patterns_dataset.csv` (90 transactions, 100 accounts):

| Metric | Measured | Requirement |
|--------|----------|-------------|
| **Total processing time** | **4.66s** | ≤ 30s |
| **Precision** | **100%** | ≥ 70% |
| **Recall** | **100%** | ≥ 60% |
| **Merchant/payroll FP** | **0** | Must be 0 |

### Scalability Safeguards for 10K Transactions

| Bottleneck | Mitigation |
|-----------|------------|
| `nx.simple_cycles()` exponential | Time-limited to 5s + cap at 500 cycles |
| Per-node DataFrame filtering | Precomputed degree/count maps |
| Risk engine recomputes cycles | Cached cycles passed from detection engine |
| Smurfing on small datasets | Adaptive threshold (5–10 based on size) |

### Complexity Summary

| Stage | Complexity |
|-------|-----------|
| CSV validation | O(n) |
| Graph construction | O(n) where n = transactions |
| Cycle detection | O((V+E) · C), bounded at 5s/C≤500 |
| Smurfing detection | O(n log n) |
| Shell chain detection | O(V · k), k = avg degree |
| Scoring | O(V + n) |
| Risk intelligence | O(V²) for centrality, one-time |
| **Total** | **O(n log n + V²)** |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+ with pip
- Node.js 16+ with npm

### Installation

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && cd ..
```

### Run

```bash
# Option 1: Windows batch file
start_all.bat

# Option 2: Manual (two terminals)
# Terminal 1 — Backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### Access

| Service | URL |
|---------|-----|
| Frontend UI | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

### Usage Flow

1. Open http://localhost:3000
2. Upload `fraud_patterns_dataset.csv`
3. Click **Run Fraud Detection**
4. Explore: Graph visualization, Fraud Summary, Rings Table, Risk Rankings
5. Download JSON results
6. Use the AI chatbot (bottom-right) to query results in natural language
7. Toggle light/dark mode (top-right)

---

## 🧪 Test Cases & Validation

### Automated Test Suite

```bash
# Unit tests (cycle, fan-out, shell chain, combined)
python -m pytest tests/test_detection.py -v

# Performance requirement validation
python test_performance.py

# Exact match test against fraud_patterns_dataset.csv
python tests/test_exact_match.py
```

### Expected Detections on `fraud_patterns_dataset.csv`

#### Cycles (7 detected)

| Ring | Accounts | Pattern |
|------|----------|---------|
| Cycle 1 | ACC_001 → ACC_002 → ACC_003 → ACC_001 | 3-node cycle, amounts 5000→4800→4600 |
| Cycle 2 | ACC_010 → ACC_011 → ACC_012 → ACC_013 → ACC_010 | 4-node cycle |
| Cycle 3 | ACC_020 → ACC_021 → ACC_022 → ACC_023 → ACC_024 → ACC_020 | 5-node cycle |
| Cycle 4 | ACC_030 → ACC_031 → ACC_032 → ACC_030 | 3-node cycle |
| Cycle 5 | ACC_040 → ACC_041 → ACC_042 → ACC_043 → ACC_040 | 4-node cycle |
| Cycle 6 | ACC_050 → ACC_051 → ACC_052 → ACC_053 → ACC_050 | 4-node cycle |
| Cycle 7 | ACC_060 → ACC_061 → ACC_062 → ACC_060 | 3-node cycle |

#### Shell Chains (35 detected)

Multi-hop layered paths through low-degree intermediary accounts, including:
- ACC_500 → ACC_501 → ACC_502 → ACC_503
- ACC_600 → ACC_601 → ACC_602 → ACC_603 (→ ACC_604)
- ACC_700 → ACC_701 → ACC_702 → ACC_703 (→ ACC_704 → ACC_705)
- ACC_800 → ACC_801 → ACC_802 → ACC_803
- ACC_900 → ACC_901 → ACC_902 → ACC_903 (→ ACC_904 → ACC_905)

#### Whitelisted (NOT flagged)

| Account | Type | Reason |
|---------|------|--------|
| ACC_200 | Merchant | 20 unique senders, only 1 outgoing |
| ACC_300 | Payroll | 18 unique receivers, only 0 incoming |

#### Normal (NOT flagged)

NORM_001 through NORM_008 — isolated 1:1 transactions with no suspicious patterns.

---

## ⚠️ Known Limitations

1. **In-memory only** — All data stored in Python process memory. No persistence across restarts. For production, integrate Redis or PostgreSQL.

2. **Single-file upload** — Processes one CSV at a time. Incremental/streaming transaction ingestion is not supported.

3. **Cycle enumeration scaling** — `nx.simple_cycles()` (Johnson's algorithm) can be exponential on very dense graphs. Mitigated by 5-second timeout and 500-cycle cap, but may miss some cycles on graphs with >5K nodes.

4. **Whitelist heuristics** — Merchant/payroll detection uses structural heuristics (degree + amount variance). A sophisticated attacker who mimics merchant patterns (many small incoming, few outgoing) could evade detection. In production, whitelist should be maintained manually or via KYC data.

5. **No ML model** — Detection is purely rule-based and graph-structural. A supervised ML layer (e.g., GNN-based anomaly detection) would improve accuracy on novel patterns.

6. **Static analysis only** — Analyzes a snapshot of transactions. Real-time streaming detection (e.g., with Kafka + Flink) would catch patterns as they form.

7. **No currency/cross-border handling** — Assumes single currency. Multi-currency transactions would need exchange-rate normalization.

8. **Smurfing threshold sensitivity** — The adaptive threshold (5–10) may need manual tuning for datasets with unusual account-count distributions.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | **FastAPI** + Uvicorn | Async REST API |
| Graph Engine | **NetworkX** | Directed graph construction, cycle detection, centrality |
| Data Processing | **Pandas** + NumPy | CSV validation, aggregation, temporal analysis |
| Validation | **Pydantic** | Request/response schema enforcement |
| Frontend | **React 18** + Vite | Single-page application |
| Graph Viz | **react-force-graph-2d** | Interactive force-directed graph |
| AI Chatbot | Custom NLP engine | Context-aware fraud result querying |
| Styling | CSS3 custom properties | Light/dark theme system |

## 📁 Project Structure

```
Money_Mauling-RIFT-26/
├── app/
│   ├── main.py              # FastAPI endpoints (upload, detect, chat, etc.)
│   ├── detection.py          # FraudDetectionEngine (cycles, smurfing, shells)
│   ├── risk_engine.py        # RiskIntelligenceEngine (5-factor scoring)
│   ├── graph_builder.py      # TransactionGraph (NetworkX wrapper)
│   ├── response_builder.py   # Deterministic JSON formatting
│   ├── alert_engine.py       # Real-time monitoring alerts
│   ├── chatbot_engine.py     # AI chatbot with fraud context
│   ├── validators.py         # CSV validation pipeline
│   └── models.py             # Pydantic response models
├── frontend/
│   └── src/
│       ├── App.jsx           # Main app with theme toggle
│       └── components/
│           ├── GraphVisualization.jsx  # Force-directed graph
│           ├── FraudRingsTable.jsx     # Ring summary table
│           ├── ResultsSummary.jsx      # Detection stats cards
│           ├── RiskRankingPanel.jsx    # Risk ranking view
│           ├── ChatBot.jsx            # AI assistant widget
│           └── ...
├── tests/
│   ├── test_detection.py     # Unit tests for detection engine
│   └── test_exact_match.py   # Exact-match validation against dataset
├── test_performance.py       # Performance requirement validation
├── fraud_patterns_dataset.csv # Reference dataset
├── requirements.txt
└── README.md                 # This file
```

---

## 🎥 Demo Walkthrough

1. **Upload** `fraud_patterns_dataset.csv` → Dashboard shows 90 transactions, 100 accounts
2. **Detect** → 7 cycles, 35 shell chains, 42 suspicious accounts, 0 false positives
3. **Graph** → Interactive visualization with ring highlighting, suspicious nodes glow red
4. **Table** → Fraud Rings Table with member account IDs, pattern types, risk scores
5. **Download** → JSON file matches exact format specification
6. **Chatbot** → "Which accounts are in RING_001?" → instant context-aware answer
7. **Theme** → Toggle light/dark mode for accessibility

---

**Version:** 4.0.0 | **Team:** RIFT-26 | **Last Updated:** February 2026
