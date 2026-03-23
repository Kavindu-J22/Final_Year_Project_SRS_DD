# Component 4 — Forensic Timeline Reconstruction & Visualization
**Student:** IT22916808  |  **Service Port:** 8004  |  **API Base:** `http://localhost:8004`

---

## 1. Overview
Component 4 reconstructs **forensic attack timelines** from raw web server logs by clustering them into semantically meaningful groups. It uses a DBSCAN-inspired pattern-matching engine augmented with TF-IDF URL vectorization concepts. Anomalous clusters (cluster ID = -1) surface attack traffic — SQL injection, path traversal, command injection — while normal clusters group legitimate traffic patterns. The service also provides entity search, aggregate metrics, and anomaly drill-down.

---

## 2. ML / Analysis Architecture

```
Raw Log Entries  ──► Pattern Classifier ──► Cluster Assignment
       │                                           │
       └──► Anomaly Detector ────────────► AnomalyDetail list
                  │
           SQL Injection   (url contains ', OR, UNION, SELECT, etc.)
           Path Traversal  (url contains ../ or ..%2F)
           Command Injection (url contains cmd=, exec=, whoami, etc.)
```

**Clustering strategy** (simulated DBSCAN):

| Cluster ID | Label | Assignment Rule |
|------------|-------|-----------------|
| -1 | Anomalies | SQL / path traversal / command injection detected |
| 0 | Normal Homepage Traffic | `/`, `/index.html`, `/home`, or unclassified |
| 1 | Static Resources | `.css`, `.js`, `.png`, `.jpg`, `.ico` |
| 2 | API Endpoints | URL contains `/api/` |
| 3 | Admin Dashboard | URL contains `/admin` |

---

## 3. Input/Output Data Models

### LogEntry (input)
```json
{
  "log_id": "attack_sql",
  "timestamp": "2026-01-05T03:45:12Z",
  "ip_address": "203.0.113.42",
  "method": "POST",
  "url": "/admin.php?id=1 OR 1=1",
  "status_code": 500,
  "user_agent": "sqlmap/1.0"
}
```

### AnalysisResult (output from POST `/analyze`)
```json
{
  "total_logs": 5,
  "num_clusters": 3,
  "noise_count": 2,
  "noise_ratio": 0.4,
  "clusters": [
    { "cluster_id": -1, "size": 2, "label": "Anomalies",
      "representative_logs": ["/admin.php?id=1 OR 1=1", "/../../etc/passwd"],
      "is_anomaly": true },
    { "cluster_id": 0, "size": 2, "label": "Normal Homepage Traffic",
      "representative_logs": ["/index.html"], "is_anomaly": false }
  ],
  "processing_time_ms": 1.23
}
```

### AnomalyDetail (output from GET `/anomalies`)
```json
{
  "log_id": "attack_sql",
  "timestamp": "2026-01-05T03:45:12Z",
  "reason": "SQL Injection attempt detected",
  "suspicious_pattern": "/admin.php?id=1 OR 1=1",
  "severity": "HIGH"
}
```

---

## 4. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check — `status`, `api_version` |
| POST | `/analyze` | Cluster a batch of log entries; stores results in memory |
| GET | `/clusters` | Cluster summaries from last analysis |
| GET | `/anomalies` | Detected anomalies from last analysis |
| GET | `/metrics` | Aggregate metrics: top IPs, method distribution, status codes |
| GET | `/search/{entity}?field=ip_address` | Search logs by field value |
| GET | `/sample-data/normal` | 5 normal GET requests |
| GET | `/sample-data/attack` | 3 attack samples (SQL, path traversal, command injection) |

### GET `/metrics` — Response
```json
{
  "total_logs": 5,
  "total_anomalies": 2,
  "num_clusters": 3,
  "noise_ratio": 0.4,
  "top_ips": [{"ip": "203.0.113.42", "count": 2}],
  "method_distribution": {"POST": 1, "GET": 4},
  "status_distribution": {"500": 1, "403": 1, "200": 3}
}
```

---

## 5. File Structure
```
forensic_timeline/
├── src/
│   ├── main.py              # FastAPI application (all endpoints)
│   ├── ml_grouper.py        # DBSCAN / TF-IDF clustering modules
│   ├── correlator.py        # Cross-event correlation logic
│   ├── timeline_generator.py# Timeline serialization utilities
│   └── config.py            # Service configuration constants
├── data/                    # Sample and training datasets
├── models/                  # Serialized ML model artefacts
├── notebooks/               # Jupyter training notebooks
└── test_data/               # Integration test payloads
```

---

## 6. Anomaly Detection Rules

| Pattern | Detection Method | Severity |
|---------|-----------------|----------|
| SQL Injection | Keywords: `'`, `OR`, `UNION`, `SELECT`, `--`, `DROP`, `1=1` | HIGH |
| Path Traversal | `../` or `..%2F` in URL | MEDIUM |
| Command Injection | `cmd=`, `exec=`, `whoami`, `cat%20`, `;ls` | MEDIUM |

---

## 7. In-Memory State
```python
ANALYZED_LOGS: List[LogEntry]       # Last batch submitted
CLUSTERS:      List[ClusterInfo]    # Cluster summaries
ANOMALIES:     List[AnomalyDetail]  # Detected anomalies
```
State is reset on each `POST /analyze` call.

---

## 8. Integration with Main Application
- Backend `timelineService` in `mlService.js` bridges to all timeline endpoints
- `POST /api/logs/analyze` calls `timelineService.analyzeLogs()` and saves a `ClusterResult` document to MongoDB
- `GET /api/forensics/timeline/anomalies` → live anomaly fetch
- `GET /api/forensics/timeline/metrics` → aggregate metrics for dashboard
- Frontend pages: `/logs` (log viewer + clustering), `/timeline` (entity search), `/forensics` (anomaly tab)

---

## 9. How to Start
```powershell
cd forensic_timeline
cd src
..\..\forensic_timeline\.venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8004 --reload
# Note: main.py is inside src/, so run from the forensic_timeline root
# Swagger UI: http://localhost:8004/docs
```

