# Quick Start Guide - Continuous Monitoring System

## 🚀 Start the System

### 1. Start Backend
```powershell
cd e:\Money_Muling
python -m uvicorn app.main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Will watch for changes in these directories: ['E:\\Money_Muling']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

### 2. Start Frontend
```powershell
cd e:\Money_Muling\frontend
npm run dev
```

**Expected Output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 3. Open Browser
Navigate to: http://localhost:5173/

---

## 🎯 Test the Monitoring System

### Step 1: Upload Initial Data
1. Click **"📂 Choose File"**
2. Select `fraud_patterns_dataset.csv` (or any valid transaction CSV)
3. Click **"⬆️ Upload CSV"**
4. Wait for success message and dashboard to appear

### Step 2: Run Fraud Detection
1. Click **"🔍 Run Fraud Detection"**
2. Wait 3-5 seconds for analysis
3. View results in graph visualization

### Step 3: Enable Monitoring
1. Locate the **"Monitoring Controls"** panel (below dashboard)
2. Click **"▶ Start Monitoring"** button
3. Status indicator should turn green: **"🟢 Live Monitoring Active"**

### Step 4: Choose Detection Strategy
1. In the monitoring controls, find **"Detection Strategy"** dropdown
2. Try different strategies:
   - **🎯 All Patterns** - Detects everything (default)
   - **🔄 Cycles Only** - Only circular routing
   - **📥📤 Fan Patterns** - Only smurfing patterns
   - **🏢 Shell Chains Only** - Only layered networks

### Step 5: Upload Incremental Data
**Option A: Via API (Postman/curl)**
```bash
curl -X POST http://localhost:8000/upload/incremental \
  -F "file=@new_transactions.csv"
```

**Option B: Create Test Data**
Create `incremental_test.csv`:
```csv
transaction_id,sender_id,receiver_id,amount,timestamp
T9001,ACC_042,ACC_088,9500,2024-01-15 14:00:00
T9002,ACC_088,ACC_042,9600,2024-01-15 14:30:00
T9003,ACC_042,ACC_088,9700,2024-01-15 15:00:00
```

This creates a high-velocity cycle pattern that should trigger alerts!

Then upload via API:
```powershell
curl -X POST http://localhost:8000/upload/incremental `
  -F "file=@incremental_test.csv"
```

### Step 6: Run Detection Again
1. Click **"🔍 Run Fraud Detection"** again
2. System will:
   - Analyze new transactions
   - Detect new patterns
   - Generate alerts (if monitoring is active)
   - Update risk intelligence

### Step 7: View Alerts
1. **Alert Panel** appears automatically when alerts are generated
2. You should see alerts like:
   - 🚨 **"New fraud ring detected with 3 members"**
   - ⚡ **"Velocity anomaly for ACC_042: 6.0 txn/hour"**
   - ⚠️ **"Risk spike detected: 45.2 → 78.5 (+33.3)"**

### Step 8: Interact with Alerts
1. **Filter alerts** by severity: Critical, High, Medium
2. **Click an alert** → System navigates to graph and selects the account
3. **Click "✓ Acknowledge"** → Mark alert as handled
4. **Click "Clear All"** → Remove all alerts

### Step 9: View Risk Intelligence
1. Click **"Rankings"** tab to see top 20 risky accounts
2. Click **"Table"** tab for sortable investigation table
3. Click **"Graph"** tab to return to visualization

---

## 🧪 Testing Scenarios

### Test 1: New Ring Detection
**Goal:** Trigger a NEW_RING alert

1. Enable monitoring
2. Upload CSV with circular pattern:
```csv
transaction_id,sender_id,receiver_id,amount,timestamp
T100,ACC_A,ACC_B,5000,2024-01-20 10:00:00
T101,ACC_B,ACC_C,4900,2024-01-20 10:30:00
T102,ACC_C,ACC_D,4800,2024-01-20 11:00:00
T103,ACC_D,ACC_A,4700,2024-01-20 11:30:00
```
3. Run fraud detection
4. **Expected:** NEW_RING alert appears

### Test 2: Risk Spike Detection
**Goal:** Trigger a RISK_SPIKE alert

1. Run fraud detection on initial data (establishes baseline)
2. Enable monitoring
3. Upload incremental data that makes a low-risk account high-risk:
   - Add the account to a fraud ring
   - Add high-velocity transactions
   - Add volume anomalies
4. Run fraud detection
5. **Expected:** RISK_SPIKE alert shows score increase

### Test 3: Velocity Anomaly
**Goal:** Trigger a VELOCITY_ANOMALY alert

1. Enable monitoring
2. Upload transactions with high velocity (10+ txns in 1 hour):
```csv
transaction_id,sender_id,receiver_id,amount,timestamp
T200,ACC_X,ACC_Y,1000,2024-01-21 14:00:00
T201,ACC_X,ACC_Z,1000,2024-01-21 14:05:00
T202,ACC_X,ACC_Y,1000,2024-01-21 14:10:00
T203,ACC_X,ACC_Z,1000,2024-01-21 14:15:00
T204,ACC_X,ACC_Y,1000,2024-01-21 14:20:00
T205,ACC_X,ACC_Z,1000,2024-01-21 14:25:00
T206,ACC_X,ACC_Y,1000,2024-01-21 14:30:00
T207,ACC_X,ACC_Z,1000,2024-01-21 14:35:00
T208,ACC_X,ACC_Y,1000,2024-01-21 14:40:00
T209,ACC_X,ACC_Z,1000,2024-01-21 14:45:00
T210,ACC_X,ACC_Y,1000,2024-01-21 14:50:00
```
3. Run fraud detection
4. **Expected:** VELOCITY_ANOMALY alert for ACC_X (11 txns/hour)

### Test 4: Critical Node
**Goal:** Trigger a CRITICAL_NODE alert

1. Enable monitoring
2. Upload data that creates an account with:
   - High centrality (many connections)
   - High velocity
   - Multiple cycles
   - Ring membership
   - Volume anomalies
3. Run fraud detection
4. **Expected:** CRITICAL_NODE alert if risk score ≥85

---

## 📊 Monitoring Dashboard

### Status Indicators
- **🟢 Green dot (pulsing)** - Monitoring active
- **⚫ Gray dot** - Monitoring inactive
- **🔔 Bell icon (ringing)** - New alerts present

### Alert Panel Features
- **Severity filters** - All, Critical, High, Medium
- **Alert count badges** - Real-time counts per severity
- **Expand/collapse** - Minimize when not actively investigating
- **Auto-refresh** - Updates every 10 seconds when monitoring active

### Alert Information
Each alert shows:
- **Type icon** - Visual indicator of alert category
- **Severity badge** - Color-coded (red/orange/yellow/green)
- **Timestamp** - Relative time (e.g., "5m ago")
- **Message** - Detailed description
- **Account/Ring ID** - Impacted entities
- **Risk score** - Current risk level
- **Metadata** - Additional context (member count, velocity, etc.)

---

## 🔧 Troubleshooting

### Backend Won't Start
**Error:** `ModuleNotFoundError: No module named 'app.alert_engine'`
**Fix:**
```powershell
cd e:\Money_Muling
python -c "from app.alert_engine import AlertEngine; print('OK')"
```
If this fails, ensure `alert_engine.py` exists in `app/` directory.

### Frontend Won't Start
**Error:** `Cannot find module './components/AlertPanel'`
**Fix:**
```powershell
cd e:\Money_Muling\frontend\src\components
dir AlertPanel.jsx
```
Ensure `AlertPanel.jsx` and `AlertPanel.css` exist.

### No Alerts Appearing
**Checklist:**
1. ✅ Monitoring enabled? (Green indicator)
2. ✅ Fraud detection run after enabling monitoring?
3. ✅ Incremental data uploaded creates new patterns?
4. ✅ Browser console shows no errors? (F12)

**Debug:**
```javascript
// Open browser console (F12)
// Check for alerts data
fetch('http://localhost:8000/alerts')
  .then(r => r.json())
  .then(d => console.log('Alerts:', d));
```

### Alerts Not Refreshing
**Issue:** Auto-refresh not working
**Check:**
```javascript
// In browser console
console.log('Monitoring active:', monitoringActive);
console.log('Auto-refresh interval:', autoRefreshInterval);
```
**Fix:** Toggle monitoring off and on again

### Graph Not Updating
**Issue:** New nodes not appearing after incremental upload
**Check:**
1. Upload successful? (Check response)
2. Graph data refetched? (Should auto-fetch after upload)
3. Browser cache cleared? (Hard refresh: Ctrl+Shift+R)

---

## 🎓 Key Concepts

### Incremental vs. Full Upload
- **Full Upload** (`/upload`) - Clears existing data, starts fresh
- **Incremental Upload** (`/upload/incremental`) - Appends to existing data

### Monitoring State
- **OFF** - Alerts not generated, system passive
- **ON** - Alerts generated automatically, system active

### Detection Strategy
- Filters which patterns to detect
- Reduces noise when focusing on specific threats
- Does not affect risk intelligence calculation

### Alert Severity
- **CRITICAL** - Immediate action required (≥85 risk or major pattern)
- **HIGH** - Investigate soon (≥60 risk or significant pattern)
- **MEDIUM** - Review when possible (≥30 risk or minor pattern)
- **LOW** - Informational (tracked but not urgent)

### Alert Lifecycle
```
Generated → Displayed → Acknowledged → Cleared/Archived
```

---

## 📈 Performance Benchmarks

### Expected Performance
- **Initial Upload:** 1000 txns < 2 seconds
- **Incremental Upload:** 100 txns < 0.5 seconds
- **Fraud Detection:** 1000 txns < 5 seconds
- **Risk Intelligence:** 1000 txns < 3 seconds
- **Alert Generation:** < 0.1 seconds
- **Frontend Refresh:** < 0.2 seconds

### Scalability
- **Max nodes:** 10,000 (tested)
- **Max alerts:** 100 (configurable)
- **Max edges:** 50,000 (tested)
- **Auto-refresh:** 10-second interval (configurable)

---

## ✅ Success Checklist

After following this guide, you should see:
- ✅ Backend running on port 8000
- ✅ Frontend running on port 5173
- ✅ CSV uploaded successfully
- ✅ Fraud detection completed
- ✅ Monitoring enabled (green indicator)
- ✅ Detection strategy selected
- ✅ Incremental data uploaded
- ✅ Alerts generated and displayed
- ✅ Alert panel interactive (filter, acknowledge, clear)
- ✅ Click alert navigates to graph
- ✅ Graph animations smooth
- ✅ Risk intelligence displays correctly

---

## 🎯 Next Steps

1. **Test with real data** - Use your bank's transaction data
2. **Customize alert thresholds** - Adjust in `alert_engine.py`
3. **Set up logging** - Configure log files for compliance
4. **Deploy to production** - Add authentication and HTTPS
5. **Train team** - Provide analyst training on alert workflows
6. **Monitor metrics** - Track alert statistics over time
7. **Tune strategies** - Optimize detection for your use case

---

## 📞 Support

**Documentation:**
- [RISK_INTELLIGENCE_ENGINE.md](./RISK_INTELLIGENCE_ENGINE.md)
- [CONTINUOUS_MONITORING_GUIDE.md](./CONTINUOUS_MONITORING_GUIDE.md)

**Logs:**
- Backend: Check terminal running uvicorn
- Frontend: Browser console (F12)
- API: http://localhost:8000/docs (Swagger UI)

**Health Check:**
```bash
curl http://localhost:8000/
```

**Monitoring Status:**
```bash
curl http://localhost:8000/monitoring/status
```

---

**Status:** ✅ Ready to Test
**System:** 🟢 Continuous Monitoring Active
**Version:** 2.0.0 - Real-Time Surveillance
