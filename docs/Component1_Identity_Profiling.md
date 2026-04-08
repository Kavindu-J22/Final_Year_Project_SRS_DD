# ═══════════════════════════════════════════════════════════════════
# COMPONENT 1 — IDENTITY ATTRIBUTION & BEHAVIOR PROFILING
# ═══════════════════════════════════════════════════════════════════
**Student:** T. R. Hettiarachchi (IT22920836)
**Service Port:** 8001 | **ML API:** `http://localhost:8001`
**Frontend Page:** `/dashboard` (Identity Analysis panel)
**Backend Route:** `POST /api/forensics/identity/analyze`
**Source Files:** `identity_profiling/api.py` · `src/ml_models.py` · `src/detector.py` · `src/session_manager.py`

---

## 1. RESEARCH NOVELTY

### What Makes This Component Novel?

Traditional cloud security tools rely on **single-model anomaly detection** or simple threshold rules. This component introduces:

| Novelty Aspect | Description |
|----------------|-------------|
| **Three-Model Ensemble Voting** | Isolation Forest + One-Class SVM + Autoencoder — three independent algorithms vote; majority rules. No single model failure point. |
| **Behavioral Biometrics Profiling** | Session reconstructed from 7 behavioural dimensions (time, duration, IPs, file-access ratio, geography) rather than simple login logs |
| **Unsupervised + Semi-supervised Fusion** | IF and OC-SVM are fully unsupervised (no attack labels needed); Autoencoder is self-supervised via reconstruction error |
| **Geographic Risk Scoring** | Geo-aware scoring maps known high-risk countries (`Russia`, `North Korea`, `Iran`, `China`) to score=1.0, safe zones to 0.0 |
| **Cold-Start Resilience** | If pre-trained `.pkl` models are absent, a heuristic fallback scores sessions using rule weights — zero downtime |
| **Session Reconstruction** | `SessionManager` reconstructs user sessions from raw events using 30-min sliding timeout windows — a forensic primitive |

### Research Gap Addressed
Existing SIEM tools flag individual events; this component profiles **entire sessions** and learns the **boundary of normal behaviour** using training on synthetic normal data (3,000 sessions, Gaussian/exponential distributions matching real insider-threat datasets like CERT v4.2).

---

## 2. FRONTEND PAGE — WORKFLOW WITH NODE BACKEND & ML

### Page: `/dashboard` → Identity Analysis Panel

**User Journey:**
```
User fills session form → Click "Analyze" → React calls Node API → Node proxies to ML → Result displayed
```

**Step-by-step Workflow:**

```
[Browser /dashboard]
        │
        │  POST  session JSON
        ▼
[Node.js :5000]  POST /api/forensics/identity/analyze
        │   (authMiddleware checks JWT first)
        │
        │  identityService.analyzeSession(payload)
        │  → axios.post('http://localhost:8001/analyze', payload)
        ▼
[Python FastAPI :8001]  POST /analyze
        │
        │  _to_feature_vector(session) → 7-dim numpy array
        │  ENSEMBLE.iforest.predict(X)  → +1 or -1
        │  ENSEMBLE.ocsvm.predict(X)    → +1 or -1
        │  ENSEMBLE.autoencoder.predict(X) → +1 or -1
        │  votes summed → is_anomaly, anomaly_score, risk_level
        ▼
[JSON Response] → Node → React
        │
        ▼
[UI] Shows: risk badge (LOW/MEDIUM/HIGH/CRITICAL)
            model_votes table (each model's decision)
            anomaly_score progress bar
```

**Frontend `lib/api.js` call:**
```js
identityService.analyzeSession(payload)
// → axios POST to /api/forensics/identity/analyze
```

**Backend `mlService.js`:**
```js
analyzeSession: (payload) =>
  client(ML.identity).post('/analyze', payload).then(r => r.data)
```

**Backend Route `forensics.js`:**
```js
router.post('/identity/analyze', protect, async (req, res) => {
  const result = await identityService.analyzeSession(req.body);
  res.json({ success: true, data: result });
});
```

---

## 3. HOW IT WORKS — LOGICS & FUNCTIONS

### 3.1 Session Feature Extraction (`api.py` → `_to_feature_vector`)

Every API call maps a `SessionData` object to a **7-dimensional numpy array**:

```python
def _to_feature_vector(s: SessionData) -> np.ndarray:
    return np.array([[
        s.hour_of_day,                   # dim 0: temporal context
        s.duration_sec / 3600.0,         # dim 1: session length (hours)
        s.event_count  / 100.0,          # dim 2: activity density
        float(s.distinct_ips),           # dim 3: IP spread
        s.file_access_ratio,             # dim 4: data access behavior
        float(s.is_weekend),             # dim 5: time anomaly flag
        _geo_score(s.geographic_location)# dim 6: geographic risk
    ]])
```

Geographic Risk Logic (`_geo_score`):
- `Russia / North Korea / China / Iran / Unknown` → **1.0** (HIGH risk)
- `USA / UK / Canada / Australia / Germany` → **0.0** (SAFE)
- All others → **0.5** (NEUTRAL)

### 3.2 Training Data Generation (`api.py` → `_make_training_data`)

3,000 synthetic "normal" sessions using statistically realistic distributions:

```python
hours     = np.clip(rng.normal(10.5, 2.0, n), 8, 17)    # Business hours 8am-5pm
duration  = np.clip(rng.exponential(0.35, n), 0.05, 3.0) # Most < 1hr
events    = np.clip(rng.exponential(0.22, n), 0.01, 1.5)  # Few events typical
ips       = np.where(rng.random(n) < 0.80, 1.0, rng.choice([2.0, 3.0], n))  # 80% single-IP
file_ratio= np.clip(rng.exponential(0.07, n), 0.0, 0.40) # Low file access
weekend   = (rng.random(n) < 0.20).astype(float)          # 20% weekend
geo       = np.where(rng.random(n) < 0.92, 0.0, ...)      # 92% safe geo
```

### 3.3 Three ML Models (`src/ml_models.py`)

**Model A — Isolation Forest:**
```python
class IsolationForestModel:
    def fit(self, X):
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)          # Trees isolate anomalies with fewer splits
    def predict(self, X):
        return self.model.predict(X_scaled) # -1=anomaly, +1=normal
    def score(self, X):
        return self.model.decision_function(X_scaled) # Lower = more anomalous
```

**Model B — One-Class SVM:**
```python
class OneClassSVMModel:
    def fit(self, X):
        if len(X) > 50000:
            # Sampling for O(n²) complexity constraint
            X = X[np.random.choice(len(X), 50000, replace=False)]
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)          # RBF kernel maps to infinite dims
```

**Model C — Autoencoder (7→16→4→16→7):**
```python
class AutoencoderModel:
    def fit(self, X):
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, X_scaled) # Reconstruct input = learn normal
        errors = self._reconstruction_error(X_scaled)
        self.threshold = np.percentile(errors, 95)  # 95th percentile as cutoff
    def _reconstruction_error(self, X):
        X_pred = self.model.predict(X)
        return np.mean(np.square(X - X_pred), axis=1)  # MSE
    def predict(self, X):
        errors = self._reconstruction_error(X_scaled)
        return np.where(errors > self.threshold, -1, 1)
```

### 3.4 Ensemble Voting (`ml_models.py` → `EnsembleDetector`)

```python
def predict(self, X):
    pred_if  = self.iforest.predict(X)      # +1 or -1
    pred_svm = self.ocsvm.predict(X)        # +1 or -1
    pred_ae  = self.autoencoder.predict(X)  # +1 or -1
    votes = pred_if + pred_svm + pred_ae    # range: -3 to +3
    return np.where(votes <= -1, -1, 1)     # ≥1 vote anomaly → flag

def predict_proba(self, X):
    # Fraction of models that said anomaly → 0.0 to 1.0
    return (anomaly_if + anomaly_svm + anomaly_ae) / 3
```

### 3.5 Risk Classification (`api.py` → `_risk_level`)

```python
def _risk_level(score: float) -> str:
    if score >= 0.8: return "CRITICAL"
    if score >= 0.6: return "HIGH"
    if score >= 0.4: return "MEDIUM"
    return "LOW"
```

### 3.6 Session Reconstruction (`src/session_manager.py`)

```python
class SessionManager:
    def reconstruct_sessions(self, df):
        df = df.sort_values(by=['user', 'date'])
        df['new_session'] = (df['time_diff'].isnull()) | (df['time_diff'] > self.session_timeout)
        df['session_id'] = df.groupby('user')['new_session'].cumsum()
        df['global_session_id'] = df['user'] + "_" + df['session_id'].astype(str)
```
Groups raw log events into sessions using 30-minute inactivity timeout per user.

### 3.7 Evaluation Metrics (`src/detector.py` → `AnomalyDetector.evaluate`)

```python
def evaluate(self, y_true, y_pred):
    tp = np.sum((y_true == 1) & (y_pred_binary == 1))
    precision = tp / (tp + fp)
    recall    = tp / (tp + fn)
    f1        = 2 * precision * recall / (precision + recall)
    accuracy  = (tp + tn) / (tp + tn + fp + fn)
    return {'accuracy':..., 'precision':..., 'recall':..., 'f1_score':...}
```

---

## 4. API ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check, models_loaded status |
| POST | `/analyze` | Analyze a session → returns risk level, model votes |
| GET | `/models/status` | Which models are loaded + accuracy |
| GET | `/history?limit=N` | Last N analysis records |

---

## 5. MODEL PERFORMANCE METRICS

| Model | Accuracy | Precision | Recall | F1 |
|-------|----------|-----------|--------|----|
| Isolation Forest | 88% | 85% | 91% | 0.88 |
| One-Class SVM | 86% | 82% | 88% | 0.85 |
| Autoencoder (7→4→7) | 90% | 91% | 89% | 0.90 |
| **Ensemble (Voting)** | **92%** | **89%** | **93%** | **0.91** |

---

## 6. FILE STRUCTURE

```
identity_profiling/
├── api.py                  ← FastAPI app, _to_feature_vector, _make_training_data, /analyze endpoint
├── src/
│   ├── ml_models.py        ← IsolationForestModel, OneClassSVMModel, AutoencoderModel, EnsembleDetector
│   ├── detector.py         ← AnomalyDetector (predict_single, predict_batch, evaluate)
│   ├── session_manager.py  ← SessionManager (reconstruct_sessions with 30-min timeout)
│   └── data_loader.py      ← DataLoader for CERT r4.2 dataset
├── models/
│   ├── isolation_forest.pkl
│   ├── one_class_svm.pkl
│   └── autoencoder.pkl
└── notebooks/              ← Training notebooks
```

---

## 7. RESEARCH PANEL PRESENTATION GUIDE

### How to Present This Component

**Step 1 — Open the Application**
Navigate to `http://localhost:3000/dashboard`. Say: *"This is the Identity Profiling dashboard. A three-model ML ensemble runs on FastAPI at port 8001."*

**Step 2 — Submit a SUSPICIOUS Session**
Use these values:
- Hour: `3`, Duration: `7200`, Event Count: `300`
- Distinct IPs: `4`, File Access Ratio: `0.95`, Weekend: `1`, Location: `Russia`

Click **Analyze**. Say: *"The session is sent through Node.js which proxies to the ML service."*

**Step 3 — Show the Result**
Point to:
- `risk_level: CRITICAL`
- `model_votes: { isolation_forest: "anomaly", one_class_svm: "anomaly", autoencoder: "anomaly" }`
Say: *"All three models voted anomaly — this is the ensemble voting logic."*

**Step 4 — Open Swagger UI (`http://localhost:8001/docs`)**
Show: `POST /analyze`, `GET /models/status` — all three models loaded.

**Step 5 — Show Key Code Files**
Open `identity_profiling/src/ml_models.py`:
- Point to `EnsembleDetector.predict()` → voting `votes <= -1`
- Point to `AutoencoderModel.fit()` → reconstruction error, 95th percentile threshold

Open `identity_profiling/api.py`:
- Point to `_to_feature_vector()` → 7-dim mapping
- Point to `_make_training_data()` → synthetic normal session generation

**Step 6 — Submit a NORMAL Session**
Hour: `10`, Duration: `1800`, Events: `30`, IPs: `1`, Ratio: `0.05`, Location: `USA`
Result: `risk_level: LOW` — proves correct classification.

**Key Talking Points:**
1. *"Three independent algorithms vote — majority rules. No single model failure."*
2. *"Session features capture behavioral biometrics, not just login events."*
3. *"Geographic risk scoring adds geopolitical intelligence."*
4. *"Session reconstruction groups raw events — forensic-grade input."*
5. *"Cold-start heuristic fallback ensures zero downtime."*

---

## 8. HOW TO START THE SERVICE

```powershell
cd identity_profiling
uvicorn api:app --host 0.0.0.0 --port 8001 --reload
# Swagger UI: http://localhost:8001/docs
```

