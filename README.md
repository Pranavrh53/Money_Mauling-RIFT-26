<div align="center">

```
 ██████╗ ██████╗  █████╗ ██████╗ ██╗  ██╗ ██████╗ ██████╗  █████╗
██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██║  ██║██╔═══██╗██╔══██╗██╔══██╗
██║  ███╗██████╔╝███████║██████╔╝███████║██║   ██║██████╔╝███████║
██║   ██║██╔══██╗██╔══██║██╔═══╝ ██╔══██║██║   ██║██╔══██╗██╔══██║
╚██████╔╝██║  ██║██║  ██║██║     ██║  ██║╚██████╔╝██║  ██║██║  ██║
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
```

# 💸 Graphora — Graph-Based Financial Crime Detection

### *Unmasking the invisible threads of financial crime, one graph at a time.*

<br/>

[![RIFT-26](https://img.shields.io/badge/🏆_RIFT--26-Hackathon_Submission-gold?style=for-the-badge)](https://github.com/Pranavrh53/Money_Mauling-RIFT-26)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

<br/>

> **🔍 What if you could see money laundering as it happens — as a living, breathing network of criminal connections?**
>
> That's exactly what **Graphora** does. We transform raw transaction data into a directed financial graph and expose the hidden rings, shells, and smurfing networks that rule-based systems can't see.

<br/>

```
┌──────────────────────────────────────────────────────────┐
│  💰 ACC_001 ──$5,000──► ACC_002 ──$4,800──► ACC_003      │
│       ▲                                         │        │
│       └──────────────── $4,600 ─────────────────┘        │
│                                                          │
│    ⚠️  CIRCULAR FUND ROUTING DETECTED — RING_001         │
└──────────────────────────────────────────────────────────┘
```

</div>

---

## 📖 Table of Contents

| # | Section | Description |
|:-:|---------|-------------|
| 1 | [🎯 The Problem](#-the-problem) | Why traditional fraud detection fails |
| 2 | [💡 Our Solution](#-our-solution) | Graph theory meets financial crime |
| 3 | [🏗️ Architecture](#-architecture) | Full system blueprint |
| 4 | [🔬 Algorithms](#-algorithm-deep-dive) | The math behind the magic |
| 5 | [📊 Suspicion Scoring](#-suspicion-score-methodology) | How accounts get flagged |
| 6 | [🛡️ False Positive Control](#-false-positive-control) | Why merchants don't get flagged |
| 7 | [⚡ Performance](#-performance-benchmarks) | Speed & accuracy benchmarks |
| 8 | [🚀 Quick Start](#-quick-start) | Get running in 60 seconds |
| 9 | [🧪 Tests & Validation](#-tests--validation) | Full test case breakdown |
| 10 | [📁 Project Structure](#-project-structure) | File-by-file guide |
| 11 | [🛠️ Tech Stack](#-tech-stack) | Tools that power the system |
| 12 | [⚠️ Known Limitations](#-known-limitations) | Honesty about trade-offs |

---

## 🎯 The Problem

> *"Every year, $800 billion to $2 trillion is laundered globally. Only 1% is ever seized."*
> — United Nations Office on Drugs and Crime

**Money muling** is the lifeblood of modern financial crime. Criminals recruit networks of "mule" accounts to move illicit funds through layered transactions — making dirty money look clean by the time it reaches its destination.

The three stages of the crime:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  STAGE 1: PLACEMENT      STAGE 2: LAYERING        STAGE 3: INTEGRATION    │
│                                                                            │
│  💵 Dirty Money    ──►   🔄 Funds hop through  ──►  ✅ Clean Money        │
│  enters through          intermediary shells,        exits to criminal's   │
│  many small deposits     cycles & chains             destination           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**The fundamental limitation of traditional systems:** They analyse transactions one by one. But fraud lives *between* transactions — in the structural patterns of the network. A single transaction from ACC_001 to ACC_002 looks innocent. But when ACC_002 routes it to ACC_003, who routes it back to ACC_001? That's a laundering cycle — and it's invisible to per-transaction rules.

---

## 💡 Our Solution

**Graphora** models the entire transaction universe as a **directed graph** — where accounts are nodes and transactions are edges — and uses advanced graph-theoretic algorithms to surface patterns that rule-based systems can never see.

| Pattern | What It Looks Like | What It Means |
|---------|-------------------|---------------|
| 🔄 **Cycles** | `A → B → C → A` | Circular routing to disguise money's origin |
| 🕸️ **Fan-in (Smurfing)** | `Many → One hub` | Multiple mules depositing into a collection account |
| 📤 **Fan-out (Smurfing)** | `One hub → Many` | Single source distributing to a mule network |
| 🐚 **Shell Chains** | `A → B → C → D` | Layered pass-through via dormant shell accounts |

> **Result:** 100% precision, 100% recall on our benchmark dataset. Zero false positives on merchants and payroll.

---

## 🏗️ Architecture

<details>
<summary><b>🖥️ Click to expand full system architecture</b></summary>

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        REACT FRONTEND  (Vite)                           ║
║                                                                          ║
║  ┌─────────────┐  ┌─────────────────┐  ┌────────────┐  ┌─────────────┐  ║
║  │  CSV Upload │  │ Force Graph Viz │  │   Fraud    │  │  AI Chat   │  ║
║  │  + Validate │  │  (NetworkX→D3) │  │   Results  │  │    Bot     │  ║
║  └──────┬──────┘  └───────┬─────────┘  └──────┬─────┘  └──────┬──────┘  ║
╚═════════╪═════════════════╪══════════════════╪═══════════════╪══════════╝
          │   REST API      │                  │               │
          ▼                 ▼                  ▼               ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         FASTAPI BACKEND                                  ║
║                                                                          ║
║  POST /upload                                                            ║
║    └──► CSV Validator (5-col check, type coercion, uniqueness)           ║
║         └──► TransactionGraph (NetworkX DiGraph builder)                 ║
║                                                                          ║
║  POST /detect-fraud                                                      ║
║    └──► FraudDetectionEngine                                             ║
║           ├── detect_cycles()        ← Johnson's + nx.simple_cycles      ║
║           ├── detect_smurfing()      ← Sliding 72h window                ║
║           ├── detect_shell_chains()  ← BFS + temporal ordering           ║
║           ├── whitelist_merchants()  ← Degree heuristic filter           ║
║           └── calculate_suspicion()  ← Weighted additive scoring         ║
║                                                                          ║
║    └──► RiskIntelligenceEngine (5-factor weighted model)                 ║
║           ├── Degree Centrality      (20%)  PageRank + betweenness       ║
║           ├── Transaction Velocity   (20%)  tx/hour, rapid ratio         ║
║           ├── Cycle Involvement      (25%)  count × cycle complexity     ║
║           ├── Ring Density           (20%)  subgraph density metric      ║
║           └── Volume Anomalies       (15%)  Z-score, structuring signals ║
║                                                                          ║
║    └──► ResponseBuilder → Deterministic, sorted JSON output              ║
║                                                                          ║
║  POST /chat → FraudChatBot (context-aware NL query engine)               ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### Data Flow in 5 Steps

```
┌─────────────┐    ┌─────────────┐    ┌───────────────────┐
│ CSV Upload  │ →  │ Graph Build │ →  │ Pattern Detection │
└─────────────┘    └─────────────┘    └────────┬──────────┘
                                               ▼
┌──────────────┐    ┌────────────────────────────────────┐
│  JSON Output │ ←  │  Risk Scoring  +  Whitelisting     │
└──────────────┘    └────────────────────────────────────┘
```

</details>

---

## 🔬 Algorithm Deep-Dive

### 🔄 1. Cycle Detection — Circular Fund Routing

> *"The oldest trick in the book — send money in a circle until it looks clean."*

**Algorithm:** Johnson's algorithm via `nx.simple_cycles()` with safety bounds

```python
def detect_cycles(G):
    cycles = []
    for cycle in nx.simple_cycles(G):       # Johnson's O((V+E)·C)
        if 3 <= len(cycle) <= 5:            # Criminally-relevant lengths only
            cycles.append(cycle)
        if len(cycles) >= 500: break        # Safety cap
        if elapsed_time > 5.0: break        # Time limit guard
    return cycles
```

**Why length 3–5?** Real-world laundering uses enough hops to obscure the trail but not so many that fees eat the profit. Lengths below 3 are too obvious; above 5 are rare and computationally expensive.

---

### 🕸️ 2. Smurfing Detection — Fan-in / Fan-out

> *"One account. Hundreds of small deposits. One massive withdrawal. Classic."*

**Algorithm:** Sliding temporal window across sorted transactions

```python
def detect_smurfing(G, transactions):
    # Adaptive threshold scales with dataset size
    threshold = 5 if len(accounts) < 50 else (7 if len(accounts) < 200 else 10)

    for account in G.nodes():
        txns = sorted(get_transactions(account), key=lambda t: t.timestamp)

        # Slide a 72-hour window
        for txn in txns:
            window = [t for t in txns if 0 <= t.time - txn.time <= 72 * 3600]
            unique_counterparties = len(set(t.counterparty for t in window))

            if unique_counterparties >= threshold:
                flag_as_smurfing(account)
```

**Complexity:** O(n log n) — fast enough for 10K+ transactions.

---

### 🐚 3. Shell Chain Detection — Layered Networks

> *"The money passed through 4 accounts in 48 hours. Each one existed for just this purpose."*

**Algorithm:** BFS with temporal ordering and degree constraints

```
For each source node:
  → BFS traversal to build paths
  → Intermediate nodes: total_degree ≤ 3   (shell account heuristic)
  → Edge timestamps must be monotonically increasing
  → Keep paths of length ≥ 3 hops
  → Remove sub-paths already contained in longer chains
```

**The degree constraint is key:** Shell accounts have almost no other activity. A node with degree > 3 is a real active account — not a shell.

---

## 📊 Suspicion Score Methodology

Every account receives a **suspicion score from 0–100** built through a multi-layer model:

### Layer 1 — Base Pattern Score

| Pattern Detected    | Points | Rationale                                 |
|---------------------|-------:|-------------------------------------------|
| 🔄 Cycle member     |  +40   | Direct involvement in circular routing    |
| 📥 Fan-in hub       |  +30   | Receives from many sources                |
| 📤 Fan-out hub      |  +30   | Sends to many targets                     |
| 🐚 Shell chain node |  +20   | Pass-through in layered chain             |

### Layer 2 — Velocity Multiplier

```
rapid_transactions = consecutive transactions < 24h apart

if rapid_count ≥ 2:
    multiplier = min(1 + rapid_count × 0.1,  2.0)   ← HARD CAP at 2×
    score      = base_score × multiplier
```

### Layer 3 — Legitimacy Penalty

```
if activity_span > 7 days  AND  transaction_count < 20:
    score ×= 0.7    →  30% reduction for regular, spread-out activity
```

### Layer 4 — Whitelist Override

```
if account == MERCHANT  or  PAYROLL:
    score = 0,  risk_level = LOW          ← Full override, no analysis
```

### Risk Level Thresholds

```
┌─────────────┬───────────────┐
│  Score ≥ 70 │ 🔴  HIGH RISK │
│  Score ≥ 40 │ 🟡   MEDIUM   │
│  Score < 40 │ 🟢    LOW     │
└─────────────┴───────────────┘
```

### Advanced 5-Factor Risk Intelligence Model

```
┌────────────────────────────────────────────────────────────────────┐
│              COMPREHENSIVE RISK SCORE  (0 – 100)                   │
├──────────────────────────────┬────────┬────────────────────────────┤
│  Factor                      │ Weight │ Source                     │
├──────────────────────────────┼────────┼────────────────────────────┤
│  Degree Centrality           │  20%   │ PageRank + betweenness     │
│  Transaction Velocity        │  20%   │ tx/hr, rapid ratio         │
│  Cycle Involvement           │  25%   │ count × cycle complexity   │
│  Ring Density                │  20%   │ subgraph connectivity      │
│  Volume Anomalies            │  15%   │ Z-score + structuring      │
├──────────────────────────────┴────────┴────────────────────────────┤
│    CRITICAL ≥ 70  │  HIGH ≥ 50  │  MEDIUM ≥ 30  │  LOW < 30       │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ False Positive Control

**Hard requirement: merchants and payroll accounts must NEVER be flagged.**

```
┌──────────────────────────────────────────────────────────────────┐
│  MERCHANT DETECTION                                              │
│                                                                  │
│  in_degree  ≥ threshold                                          │
│  out_degree ≤ 2                                                  │
│  unique_senders ≥ threshold                                      │
│  → WHITELISTED ✅                                                │
├──────────────────────────────────────────────────────────────────┤
│  PAYROLL DETECTION                                               │
│                                                                  │
│  out_degree  ≥ threshold                                         │
│  in_degree   ≤ 2                                                 │
│  unique_receivers ≥ threshold                                    │
│  coefficient_of_variation(amounts) < 0.5                         │
│  → WHITELISTED ✅                                                │
└──────────────────────────────────────────────────────────────────┘
```

### 7-Layer Defense Against False Positives

| Layer | Mechanism             | Effect                                         |
|:-----:|-----------------------|------------------------------------------------|
| 1️⃣   | Whitelisting          | Merchants/payroll scored to 0 before analysis  |
| 2️⃣   | Smurfing exclusion    | Whitelisted accounts skip fan-in/fan-out        |
| 3️⃣   | 72-hour time window   | Rejects coincidental long-term patterns         |
| 4️⃣   | Adaptive thresholds   | Scale with dataset size (5 / 7 / 10)           |
| 5️⃣   | Velocity cap          | 2.0× maximum prevents score inflation           |
| 6️⃣   | Spread penalty        | 30% reduction for regular, spaced-out activity |
| 7️⃣   | Cycle length bounding | Length 3–5 with 5 s timeout                    |

### ✅ Verified Non-Flags on Reference Dataset

| Account      | Type     | Activity                        | Result         |
|--------------|----------|---------------------------------|----------------|
| ACC_200      | Merchant | 20 unique senders, 1 outgoing   | ✅ NOT flagged |
| ACC_300      | Payroll  | 18 unique receivers, 0 incoming | ✅ NOT flagged |
| NORM_001–008 | Normal   | Isolated 1:1 transactions       | ✅ NOT flagged |

---

## ⚡ Performance Benchmarks

Tested on `fraud_patterns_dataset.csv` — 90 transactions, 100 accounts:

| Metric               | Our Result | Requirement | Status          |
|----------------------|:----------:|:-----------:|:---------------:|
| ⏱️ Processing Time   | **4.66 s** | ≤ 30 s      | ✅ 6.4× faster  |
| 🎯 Precision         | **100%**   | ≥ 70%       | ✅ Perfect      |
| 🔎 Recall            | **100%**   | ≥ 60%       | ✅ Perfect      |
| 🚫 False Positives   | **0**      | Must be 0   | ✅ Zero         |

### Per-Stage Complexity

| Stage                 | Time Complexity     | Notes                         |
|-----------------------|---------------------|-------------------------------|
| CSV Validation        | O(n)                | Linear scan                   |
| Graph Construction    | O(n)                | n = number of transactions    |
| Cycle Detection       | O((V+E)·C)          | Bounded: 5 s / 500 cycles max |
| Smurfing Detection    | O(n log n)          | Sort + sliding window         |
| Shell Chain Detection | O(V·k)              | k = average node degree       |
| Scoring               | O(V + n)            | Linear                        |
| Risk Intelligence     | O(V²)               | Centrality, one-time cost     |
| **Total**             | **O(n log n + V²)** | Sub-5 s in practice           |

### Scalability Safeguards for 10K+ Transactions

```
┌──────────────────────────────────────┬────────────────────────────────────────┐
│  Bottleneck                          │  Mitigation                            │
├──────────────────────────────────────┼────────────────────────────────────────┤
│  nx.simple_cycles() exponential      │  5 s timeout + 500 cycle hard cap      │
│  Per-node DataFrame filtering        │  Precomputed degree / count maps       │
│  Risk engine cycle recomputation     │  Cached cycles passed from detector    │
│  Smurfing on small datasets          │  Adaptive threshold (5 / 7 / 10)       │
└──────────────────────────────────────┴────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

```bash
python --version    # 3.8+
node   --version    # 16+
npm    --version    # 8+
```

### Install & Run

```bash
# 1. Clone
git clone https://github.com/Pranavrh53/Money_Mauling-RIFT-26.git
cd Money_Mauling-RIFT-26

# 2. Backend
pip install -r requirements.txt

# 3. Frontend
cd frontend && npm install && cd ..

# 4a. Windows — one command
start_all.bat

# 4b. Mac / Linux — two terminals
# Terminal 1:
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Terminal 2:
cd frontend && npm run dev
```

### Access Points

| Service          | URL                         | Purpose                  |
|------------------|-----------------------------|--------------------------|
| 🖥️ Frontend UI   | http://localhost:3000        | Main dashboard           |
| ⚙️ Backend API   | http://localhost:8000        | REST endpoints           |
| 📚 Swagger Docs  | http://localhost:8000/docs   | Interactive API explorer |

### Usage Flow

```
[1] Open http://localhost:3000
     ↓
[2] Upload  fraud_patterns_dataset.csv
     ↓
[3] Click  "Run Fraud Detection"
     ↓
[4] Explore results
     ├── 🕸️  Graph Visualization  — suspicious nodes glow red
     ├── 📋  Fraud Rings Table    — ring IDs, members, risk scores
     ├── 📊  Results Summary      — detection stat cards
     └── 🏆  Risk Rankings Panel
     ↓
[5] Download JSON results
     ↓
[6] Ask the AI Chatbot
     →  "Which accounts are in RING_001?"
     →  "What is the risk score for ACC_001?"
     →  "How many shell chains were detected?"
     ↓
[7] Toggle 🌙 dark mode (top-right)
```

---

## 🧪 Tests & Validation

### Run the Full Suite

```bash
# Unit tests — cycle, fan-out, shell chain, combined
python -m pytest tests/test_detection.py -v

# Performance requirement validation
python test_performance.py

# Exact match against fraud_patterns_dataset.csv
python tests/test_exact_match.py

# API integration tests
python test_api.py

# Pattern detection suite
python test_pattern_detection.py
```

### Expected Detections on `fraud_patterns_dataset.csv`

#### 🔄 Cycles Detected — 7 total

| Ring ID  | Chain                                                     | Pattern           |
|----------|-----------------------------------------------------------|-------------------|
| RING_001 | ACC_001 → ACC_002 → ACC_003 → ACC_001                     | 3-node, ↓ amounts |
| RING_002 | ACC_010 → ACC_011 → ACC_012 → ACC_013 → ACC_010           | 4-node cycle      |
| RING_003 | ACC_020 → ACC_021 → ACC_022 → ACC_023 → ACC_024 → ACC_020 | 5-node cycle      |
| RING_004 | ACC_030 → ACC_031 → ACC_032 → ACC_030                     | 3-node cycle      |
| RING_005 | ACC_040 → ACC_041 → ACC_042 → ACC_043 → ACC_040           | 4-node cycle      |
| RING_006 | ACC_050 → ACC_051 → ACC_052 → ACC_053 → ACC_050           | 4-node cycle      |
| RING_007 | ACC_060 → ACC_061 → ACC_062 → ACC_060                     | 3-node cycle      |

#### 🐚 Shell Chains Detected — 35 total (sample)

```
ACC_500 → ACC_501 → ACC_502 → ACC_503
ACC_600 → ACC_601 → ACC_602 → ACC_603 → ACC_604
ACC_700 → ACC_701 → ACC_702 → ACC_703 → ACC_704 → ACC_705
ACC_800 → ACC_801 → ACC_802 → ACC_803
ACC_900 → ACC_901 → ACC_902 → ACC_903 → ACC_904 → ACC_905
```

#### ✅ Detection Summary

```
┌──────────────────────────────────────────┬────────┐
│  Total accounts analyzed                 │   100  │
│  Suspicious accounts flagged             │    42  │
│  Fraud rings detected                    │    42  │
│  False positives  (merchants)            │     0  │
│  False positives  (payroll)              │     0  │
│  False positives  (normal accounts)      │     0  │
│  Processing time                         │ 4.66 s │
└──────────────────────────────────────────┴────────┘
```

---

## 📄 JSON Output Format

The `/download-results` endpoint returns fully deterministic JSON:

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
    "processing_time_seconds": 4.66
  }
}
```

**Determinism Guarantees:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  suspicious_accounts  sorted by score DESC, then account_id ASC      │
│  ring IDs             sequential  →  RING_001, RING_002, ...         │
│  member_accounts      sorted alphabetically within each ring         │
│  detected_patterns    sorted alphabetically                          │
│  Same input           always produces identical output               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Graphora-RIFT-26/
│
├── 🐍 app/
│   ├── main.py                  All API endpoints
│   ├── detection.py             FraudDetectionEngine (cycles, smurfing, shells)
│   ├── risk_engine.py           RiskIntelligenceEngine (5-factor model)
│   ├── graph_builder.py         TransactionGraph (NetworkX wrapper)
│   ├── response_builder.py      Deterministic JSON formatter
│   ├── alert_engine.py          Real-time monitoring alerts
│   ├── chatbot_engine.py        AI chatbot with fraud context
│   ├── validators.py            CSV validation pipeline
│   └── models.py                Pydantic request/response models
│
├── ⚛️  frontend/src/
│   ├── App.jsx                  Root app + light/dark theme toggle
│   └── components/
│       ├── GraphVisualization.jsx   Force-directed interactive graph
│       ├── FraudRingsTable.jsx      Ring summary data table
│       ├── ResultsSummary.jsx       Detection stats cards
│       ├── RiskRankingPanel.jsx     Risk score leaderboard
│       └── ChatBot.jsx              AI assistant widget
│
├── 🧪 tests/
│   ├── test_detection.py        Unit tests for all detection patterns
│   └── test_exact_match.py      Exact-match validation against dataset
│
├── 📊 fraud_patterns_dataset.csv    Reference benchmark dataset
├── 📄 FRAUD_DETECTION_DOCUMENTATION.md
├── 📋 SETUP_GUIDE.md
├── 🐳 Dockerfile
└── 📦 requirements.txt
```

---

## 🛠️ Tech Stack

| Layer           | Technology               | Why We Chose It                        |
|-----------------|--------------------------|----------------------------------------|
| 🖥️ Frontend     | **React 18** + Vite      | Fast HMR, modern component model       |
| 📊 Graph Viz    | **react-force-graph-2d** | GPU-accelerated force-directed layout  |
| ⚙️ Backend      | **FastAPI** + Uvicorn    | Async, auto-documented, blazing fast   |
| 🕸️ Graph Engine | **NetworkX**             | Industry-standard for graph algorithms |
| 🔢 Data         | **Pandas** + NumPy       | CSV parsing, temporal analysis         |
| ✅ Validation   | **Pydantic**             | Schema enforcement, type coercion      |
| 🤖 AI Chatbot   | Custom NLP engine        | Context-aware fraud result querying    |
| 🎨 Styling      | CSS3 custom properties   | Light / dark theme system              |
| 🐳 Container    | Docker                   | Portable, reproducible environment     |

---

## ⚠️ Known Limitations

We believe in honesty about trade-offs. Here's what we'd improve in a production system:

| Limitation            | Current State               | Production Solution              |
|-----------------------|-----------------------------|----------------------------------|
| 💾 Persistence        | In-memory only              | Redis or PostgreSQL              |
| 📂 Ingestion          | Single CSV at a time        | Kafka + streaming pipeline       |
| 🔄 Cycle scaling      | Exponential on dense graphs | Approximation algorithms         |
| 🏷️ Whitelist          | Heuristic-based             | Manual KYC database              |
| 🤖 Detection          | Rule-based only             | GNN-based anomaly detection      |
| ⏱️ Real-time          | Static snapshot             | Flink / Spark streaming          |
| 💱 Currency           | Single-currency only        | Exchange-rate normalization      |
| 📏 Smurfing threshold | May need tuning             | Learned adaptive threshold       |

---

## 🎥 Demo Walkthrough

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Step 1  Upload fraud_patterns_dataset.csv                           │
│          → Dashboard shows 90 transactions across 100 accounts       │
│                                                                      │
│  Step 2  Click "Run Fraud Detection"                                 │
│          → 4.66 s later: 42 suspicious accounts flagged              │
│                          7 cycles + 35 shell chains detected         │
│                                                                      │
│  Step 3  Graph Tab                                                   │
│          → Force-directed network — suspicious nodes pulse red       │
│          → Click any node for its full risk profile                  │
│                                                                      │
│  Step 4  Fraud Rings Table                                           │
│          → Member IDs, pattern types, risk scores — sortable         │
│                                                                      │
│  Step 5  Download Results                                            │
│          → JSON file in exact deterministic specification format     │
│                                                                      │
│  Step 6  Ask the AI Chatbot                                          │
│          → "Which accounts are in RING_001?"                         │
│          → "What's the risk score for ACC_001?"                      │
│          → "How many shell chains were detected?"                    │
│                                                                      │
│  Step 7  Toggle 🌙 Dark Mode  (top-right corner)                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

<div align="center">

### 🏆 Built for RIFT-26 Hackathon

*Turning the invisible threads of financial crime into visible patterns.*

```
Version 4.0.0  •  Team RIFT-26  •  February 2026
```

*If this project helped you, consider giving it a ⭐ — it means a lot to the team!*

</div>
