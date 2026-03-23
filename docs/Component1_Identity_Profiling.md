# Component 1 — Identity Attribution & Behavior Profiling
**Student:** IT22920836  |  **Service Port:** 8001  |  **API Base:** `http://localhost:8001`

---

## 1. Overview
Component 1 detects **insider threats and anomalous user behaviour** by profiling every cloud-user session through a three-model ML ensemble. Instead of a single black-box classifier, three independent algorithms vote on whether a session is anomalous; a majority vote determines the final verdict. This ensemble approach significantly reduces both false positives and false negatives.

---

## 2. ML Algorithms

| Model | Algorithm | Role |
|-------|-----------|------|
| `isolation_forest` | Isolation Forest (sklearn) | Unsupervised anomaly isolation via random partitioning |
| `one_class_svm` | One-Class SVM / SGD variant | Learns the boundary of normal behaviour in kernel space |
| `autoencoder` | Neural Network Autoencoder (7→4→7) | Reconstructs normal sessions; high reconstruction error = anomaly |

**Ensemble Voting Rule:** If ≥ 50 % of loaded models flag a session as anomalous (`-1`), the session is marked `is_anomaly = true`.  
**Heuristic Fallback:** When no `.pkl` model files exist the service computes a rule-based `anomaly_score` from contributing factor count (used for demo / cold-start).

---

## 3. Input Feature Vector (7 dimensions)

| Feature | Type | Description |
|---------|------|-------------|
| `hour_of_day` | int 0–23 | Local hour of session start |
| `duration_sec` | int ≥ 0 | Session length in seconds |
| `event_count` | int ≥ 0 | Number of events in session |
| `distinct_ips` | int ≥ 1 | Distinct IP addresses seen |
| `file_access_ratio` | float 0–1 | Fraction of events that are file reads |
| `is_weekend` | int 0/1 | Weekend flag |
| `geographic_location` | str | Encoded: USA → 0, all others → 1 |

---

## 4. Risk Classification

| `anomaly_score` range | Risk Level |
|-----------------------|------------|
| ≥ 0.70 | CRITICAL |
| 0.50 – 0.69 | HIGH |
| 0.30 – 0.49 | MEDIUM |
| < 0.30 | LOW |

---

## 5. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check — returns `models_loaded`, `api_version` |
| POST | `/analyze` | Analyse one user session → `AnalysisResult` |
| GET | `/history?limit=N` | Last N analysis results (persisted to `data/history.json`) |
| GET | `/models/status` | Per-model loaded status + accuracy/precision/recall |
| GET | `/sample-data/normal` | Pre-built normal session sample |
| GET | `/sample-data/anomaly` | Pre-built anomalous session sample |

### POST `/analyze` — Request Body
```json
{
  "user_id": "suspicious@test.com",
  "hour_of_day": 3,
  "duration_sec": 1800,
  "event_count": 250,
  "distinct_ips": 1,
  "file_access_ratio": 0.95,
  "is_weekend": 0,
  "geographic_location": "Russia"
}
```

### POST `/analyze` — Response
```json
{
  "user_id": "suspicious@test.com",
  "is_anomaly": true,
  "anomaly_score": 0.67,
  "risk_level": "HIGH",
  "contributing_factors": [
    "Unusual access time (late night/early morning)",
    "High file access ratio (potential data exfiltration)"
  ],
  "model_votes": { "isolation_forest": -1, "one_class_svm": -1, "autoencoder": 1 },
  "timestamp": "2026-03-23T08:00:00.000000"
}
```

---

## 6. File Structure
```
identity_profiling/
├── api.py              # FastAPI application (all endpoints)
├── src/
│   └── ml_models.py    # IsolationForestModel, OneClassSVMModel, AutoencoderModel wrappers
├── models/
│   ├── isolation_forest.pkl
│   ├── one_class_svm.pkl  (or sgd_one_class_svm.pkl)
│   └── autoencoder.pkl
├── data/
│   └── history.json    # Persistent result log
└── notebooks/          # Jupyter training notebooks
```

---

## 7. Model Performance Metrics

| Model | Accuracy | Precision | Recall |
|-------|----------|-----------|--------|
| Isolation Forest | 88 % | 85 % | 91 % |
| One-Class SVM | 86 % | 82 % | 88 % |
| Autoencoder | 90 % | 91 % | 89 % |

---

## 8. Integration with Main Application
- The Node.js backend calls `/analyze` via `identityService.analyzeSession()` in `mlService.js`
- The backend also exposes `POST /api/forensics/identity/analyze` and `GET /api/forensics/identity/history` so the React frontend can display behaviour profiling results without directly calling port 8001
- History tab at `/history` in the frontend shows all past analysis records

---

## 9. How to Start
```powershell
cd identity_profiling
.\.venv\Scripts\uvicorn api:app --host 0.0.0.0 --port 8001 --reload
# Swagger UI: http://localhost:8001/docs
```

