# System Implementation — Cloud Forensics Platform
**Final Year Research Project | 4-Member Team**

---

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Component 1 — Identity Attribution & Behavior Profiling (IT22920836)](#3-component-1--identity-attribution--behavior-profiling)
4. [Component 2 — Incident Detection & Correlation Engine (IT22033550)](#4-component-2--incident-detection--correlation-engine)
5. [Component 3 — Evidence Preservation & Chain of Custody (IT22581402)](#5-component-3--evidence-preservation--chain-of-custody)
6. [Component 4 — Forensic Timeline Reconstruction (IT22916808)](#6-component-4--forensic-timeline-reconstruction)
7. [Central Backend (Node.js/Express)](#7-central-backend-nodejs--express)
8. [Frontend Dashboard (Next.js)](#8-frontend-dashboard-nextjs)
9. [Database Schema (MongoDB)](#9-database-schema-mongodb)
10. [System Test Runner](#10-system-test-runner)
11. [Data Flow — End-to-End](#11-data-flow--end-to-end)

---

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend  (Port 3000)                    │
│  Dashboard · Log Viewer · Incidents · Forensics · Timeline · Tests   │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  REST API  (JWT Auth)
┌──────────────────────────▼───────────────────────────────────────────┐
│               Node.js / Express Backend  (Port 5000)                 │
│  /api/logs  /api/incidents  /api/forensics  /api/system  /api/dashboard│
└────────┬──────────┬──────────────┬─────────────────────┬────────────┘
         │          │              │                     │
    Port 8001   Port 8002      Port 8003            Port 8004
┌────────▼──┐ ┌────▼──────┐ ┌────▼────────────┐ ┌──────▼────────────┐
│ Identity  │ │ Incident  │ │ Evidence        │ │ Forensic Timeline │
│ Profiling │ │ Detection │ │ Preservation    │ │ Reconstruction    │
│ FastAPI   │ │ FastAPI   │ │ FastAPI         │ │ FastAPI           │
└────────┬──┘ └────┬──────┘ └────┬────────────┘ └──────┬────────────┘
         └─────────┴──────────────┴────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  MongoDB  (cloudforensics)│
                    │  logentries · incidents  │
                    │  forensicblocks          │
                    └──────────────────────────┘
```

Each ML microservice operates independently with its own trained models. The Node.js backend acts as an API gateway — it proxies calls to the correct service, persists results to MongoDB, and aggregates data for the dashboard.

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (App Router) | 14+ |
| Frontend State | React useState / useEffect | 18 |
| Frontend Charts | Recharts (ComposedChart, Area, Bar) | 2+ |
| Backend Gateway | Node.js + Express | 20 LTS |
| ORM | Mongoose | 8+ |
| Database | MongoDB | 6+ |
| ML Services | Python FastAPI + Uvicorn | FastAPI 0.100+ |
| ML Libraries | scikit-learn, numpy, pandas | latest |
| Auth | JWT (jsonwebtoken) + bcryptjs | — |
| HTTP Client (BE) | Axios | 1+ |

---

## 3. Component 1 — Identity Attribution & Behavior Profiling

**Author:** IT22920836 | **Port:** 8001 | **File:** `identity_profiling/api.py`

### 3.1 Purpose
Detects anomalous user sessions in cloud environments using a multi-model ensemble approach. Assigns a risk level (LOW / MEDIUM / HIGH / CRITICAL) to each incoming session.

### 3.2 Feature Vector (7 features)

| Feature | Description |
|---|---|
| `hour_of_day` | 0–23; late-night sessions score higher |
| `duration_sec` | Session length; unusually long = suspicious |
| `event_count` | Actions per session; high count = automation likely |
| `distinct_ips` | Number of IPs in the session; >1 = anomalous |
| `file_access_ratio` | Proportion of file-access events (0–1) |
| `is_weekend` | Binary; weekend access from corp accounts = higher risk |
| `geographic_location` | Categorical; encodes known/unknown regions |

### 3.3 Model Ensemble

```
Input Feature Vector (7 dims)
         │
    ┌────▼──────┐  ┌────────────────┐  ┌─────────────┐
    │ Isolation │  │  One-Class SVM │  │ Autoencoder │
    │  Forest   │  │   (nu=0.05)    │  │ (64→16→64)  │
    └────┬──────┘  └────────┬───────┘  └──────┬──────┘
         │                 │                   │
         └────────┬─────────┘                  │
                  │   Majority Vote             │  Reconstruction
              anomaly?                          │  Error > threshold
                  │                             │
              ────▼─────────────────────────────▼────
                        Final Decision
                  is_anomaly=True / False
                  risk_level = LOW|MEDIUM|HIGH|CRITICAL
```

**Isolation Forest:** Builds an ensemble of random trees. Anomalies require fewer splits to isolate → shorter path length → higher anomaly score. Trained with `contamination=0.1`.

**One-Class SVM:** Learns a boundary around normal-session feature space using an RBF kernel. Sessions outside this boundary are anomalies.

**Autoencoder:** Trained to reconstruct normal sessions. High reconstruction error (MSE) for unseen abnormal patterns triggers the anomaly flag.

**Risk Level Assignment:**
```python
if anomaly_score > 0.8:  risk = "CRITICAL"
elif anomaly_score > 0.6: risk = "HIGH"
elif anomaly_score > 0.4: risk = "MEDIUM"
else:                     risk = "LOW"
```

### 3.4 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — returns model load status |
| `POST` | `/analyze` | Analyze a user session → `{ is_anomaly, risk_level, anomaly_score }` |
| `GET` | `/models/status` | Returns status of each model in the ensemble |
| `GET` | `/history?limit=N` | Returns last N analyzed sessions |

### 3.5 How It Works — Step by Step

1. Frontend (Log Viewer) sends user session data via Node.js backend.
2. Backend calls `POST http://localhost:8001/analyze` with the feature vector.
3. Isolation Forest, SVM, and Autoencoder each vote on anomaly status.
4. Majority vote determines `is_anomaly`; weighted scores set `risk_level`.
5. Result is returned to the backend, stored in `LogEntry` MongoDB collection, and surfaced on the dashboard.

---

## 4. Component 2 — Incident Detection & Correlation Engine

**Author:** IT22033550 | **Port:** 8002 | **File:** `incident_detection/api.py`

### 4.1 Purpose
Detects and correlates security incidents by matching event streams against MITRE ATT&CK technique rules. Identifies attack campaigns spanning multiple events within configurable time windows.

### 4.2 Rule Detection Logic

Each **detection rule** has this structure:
```json
{
  "rule_id": "RULE-001",
  "name": "Brute Force Login Attack",
  "mitre_technique": "T1110",
  "event_type": "FailedLogin",
  "threshold": 5,
  "time_window_minutes": 10,
  "severity": "HIGH",
  "description": "Multiple failed logins from the same IP"
}
```

**Rule Matching Algorithm:**
```
For each incoming event stream:
  1. Group events by (event_type, source_ip)
  2. Apply sliding time window (default: 30 min)
  3. For each rule:
       count = events matching rule.event_type in window
       if count >= rule.threshold:
         → Trigger rule → Create incident
  4. Correlate triggered rules into incidents
  5. Return array of Incident objects
```

### 4.3 Correlation Engine

```
Raw Events → [Ingest Buffer]
                    │
            Time Window Slicing (30 min)
                    │
            Rule Matching Engine
           ┌────────┴────────────┐
           │  MITRE Rule Store   │ (JSON rules, hot-reloadable)
           └────────┬────────────┘
                    │ matched rules
            Incident Grouping
           (same campaign = one incident)
                    │
            Incident Objects
          { alert_id, title, severity,
            mitre_technique, source_ip,
            correlated_events[], recommendations[] }
```

### 4.4 Rule Store (Dynamic)
Rules are stored in-memory and in a JSON rule store file. They can be:
- **Imported** via `POST /import-rules`
- **Exported** via `GET /export-rules`
- **Deleted** via `DELETE /rules/:id`
- **Viewed** via `GET /rules` and `GET /store`

This means the system can be re-tuned at runtime without restarting the service.

### 4.5 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/ingest` | Ingest a single event into the buffer |
| `POST` | `/correlate` | Correlate a batch of events → `[Incident]` |
| `GET` | `/incidents` | List detected incidents |
| `GET` | `/rules` | List all detection rules |
| `GET` | `/store` | Full rule store with metadata |
| `POST` | `/import-rules` | Bulk import rules |
| `GET` | `/export-rules` | Export rules as JSON |
| `DELETE` | `/rules/:id` | Delete a rule |

### 4.6 How It Works — Step by Step

1. Log events arrive at `POST /ingest` or are batched to `POST /correlate`.
2. The correlation engine applies the sliding time window.
3. Each event is checked against all loaded rules. A rule fires when `event_count >= threshold` within the window.
4. Fired rules for the same source IP / user are grouped into a single `Incident`.
5. Each incident is tagged with its MITRE ATT&CK technique ID and recommended remediation.
6. The Node.js backend persists the incident to MongoDB's `incidents` collection with a unique `alertId`.

---

## 5. Component 3 — Evidence Preservation & Chain of Custody

**Author:** IT22581402 | **Port:** 8003 | **File:** `evidence_preservation/api.py`

### 5.1 Purpose
Provides cryptographically tamper-evident evidence preservation using a SHA-256 blockchain-like structure combined with RSA-2048 digital signatures. Ensures forensic integrity for legal admissibility.

### 5.2 Block Structure

Each preserved evidence entry creates an immutable **ForensicBlock**:

```json
{
  "block_index": 42,
  "timestamp": "2024-01-15T10:30:00Z",
  "log_id": "log-12345",
  "event_type": "AnomalyDetected",
  "user_id": "attacker@domain.com",
  "action": "Unauthorized access attempt",
  "metadata": { "risk": "CRITICAL" },
  "previous_hash": "a3f9d2e1c4b7...",
  "hash": "7c3f9d2e1c4b...",
  "digital_signature": "base64encodedRSA..."
}
```

### 5.3 Chain Verification Logic

```
Chain Verification Algorithm:
─────────────────────────────
For block[i] in chain (i = 1 to N):
  1. Recompute hash(block[i].content) using SHA-256
  2. Compare with stored block[i].hash
     → FAIL if mismatch (tampering detected)
  3. Compare block[i].previous_hash with block[i-1].hash
     → FAIL if mismatch (chain broken)
  4. Verify digital signature:
       RSA.verify(block[i].hash, block[i].digital_signature, public_key)
     → FAIL if signature invalid (forgery detected)

Result: { is_valid: true|false, total_blocks: N, integrity_status: "VALID"|"COMPROMISED" }
```

### 5.4 SHA-256 Hashing

Each block's hash is computed over the canonical JSON of its content fields (excluding the hash itself):
```python
import hashlib, json

def compute_hash(block_data: dict) -> str:
    content = json.dumps(block_data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(content.encode()).hexdigest()  # 64-char hex string
```

`sort_keys=True` ensures deterministic serialization regardless of dict insertion order.

### 5.5 RSA-2048 Digital Signature

```python
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

# Signing (on preserve):
signature = private_key.sign(
    block_hash.encode(),
    padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
    hashes.SHA256()
)

# Verification (on verify):
public_key.verify(signature, block_hash.encode(), ...)
```

### 5.6 MongoDB Fallback (Node.js Backend)

When the Evidence service (port 8003) is offline, the Node.js backend automatically falls back to MongoDB:
```javascript
// forensics.js — /verify endpoint
try {
  const result = await evidenceService.verifyChain();   // ML service
} catch (err) {
  // Fallback: query ForensicBlock MongoDB mirror
  const blocks = await ForensicBlock.find().sort({ blockIndex: 1 });
  const invalid = blocks.filter(b => b.integrityStatus !== 'VALID').length;
  // Return integrity report from DB
}
```

### 5.7 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/preserve` | Add an evidence entry → returns new block with hash & signature |
| `POST` | `/verify` | Run full chain verification → `{ is_valid, total_blocks, integrity_status }` |
| `GET` | `/chain` | Return full evidence chain |
| `GET` | `/block/:index` | Return specific block |
| `GET` | `/stats` | Chain statistics |

---

## 6. Component 4 — Forensic Timeline Reconstruction

**Author:** IT22916808 | **Port:** 8004 | **File:** `forensic_timeline/main.py`

### 6.1 Purpose
Reconstructs forensic attack timelines from raw log data using DBSCAN clustering and TF-IDF text vectorization. Groups related events into attack clusters and identifies noise (isolated anomalies).

### 6.2 DBSCAN Clustering

**DBSCAN (Density-Based Spatial Clustering of Applications with Noise)** is chosen because:
- Does NOT require specifying the number of clusters in advance.
- Labels isolated anomalies as **noise** (label = −1) — ideal for forensics.
- Discovers clusters of arbitrary shape.

```
DBSCAN Parameters:
  eps = 0.5       (neighborhood radius in feature space)
  min_samples = 2 (minimum points to form a core point)

Algorithm:
  For each log entry:
    1. Compute feature vector (TF-IDF + numerical)
    2. Find all points within distance eps (neighbors)
    3. If |neighbors| >= min_samples → CORE POINT → start cluster
    4. Expand cluster to all density-reachable points
    5. Points not reachable from any core → NOISE (anomaly)

Output:
  cluster_id = 0,1,2,...  → Related attack group
  cluster_id = -1         → Isolated anomaly (noise)
```

### 6.3 Feature Extraction Pipeline

```
Raw Log Entry
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ Feature Extraction                                  │
│                                                     │
│  Numerical: hour, method_code, status_code          │
│  Categorical: ip_address (encoded), user_agent      │
│  Text (TF-IDF): url path tokens                     │
│    → "admin php id 1 union select" → attack tokens  │
│    → "index html" → normal tokens                   │
└────────────────────────┬────────────────────────────┘
                         │  combined feature vector
                         ▼
                 StandardScaler (normalize)
                         │
                         ▼
                      DBSCAN
                         │
               ┌─────────┴─────────┐
               │                   │
           Clusters             Noise (-1)
        (attack groups)     (isolated events)
```

### 6.4 TF-IDF Vectorization for URL Analysis

URL paths are tokenized and TF-IDF scored:
- High IDF terms: `union`, `select`, `passwd`, `beacon`, `admin.php` → attack-related
- Low IDF terms: `index`, `html`, `api`, `v1` → common/benign

This allows the clustering to group SQL injection URLs together even if they differ slightly.

### 6.5 Entity Search

The `/search/:entity` endpoint queries clusters for a specific IP address, user agent, or URL pattern — enabling an investigator to reconstruct all actions of a specific attacker.

### 6.6 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/analyze` | Analyze a log batch → `{ num_clusters, noise_count, total_logs, clusters[] }` |
| `GET` | `/clusters` | Return last clustering result |
| `GET` | `/anomalies` | Return all noise-point logs |
| `GET` | `/metrics` | Silhouette score, cluster sizes, timestamps |
| `GET` | `/search/:entity` | Find all events for an entity (IP/user/URL) |

---

## 7. Central Backend (Node.js / Express)

**Port:** 5000 | **File:** `backend/server.js`

### 7.1 Route Structure

| Route Prefix | File | Description |
|---|---|---|
| `/api/auth` | `routes/auth.js` | JWT login & registration |
| `/api/logs` | `routes/logs.js` | CRUD for LogEntry documents |
| `/api/incidents` | `routes/incidents.js` | CRUD + status updates for Incidents |
| `/api/forensics` | `routes/forensics.js` | Proxy to Evidence service + DB fallback |
| `/api/dashboard` | `routes/dashboard.js` | Stats, recent activity, ML health |
| `/api/system` | `routes/systemTest.js` | Smoke tests, seed data, advanced suites |

### 7.2 ML Service Bridge (`mlService.js`)

Each component has a pre-configured Axios client:
```javascript
const client = (baseURL) =>
  axios.create({ baseURL, timeout: 30_000 });

const identityService = { analyzeSession: (p) => client(ML.identity).post('/analyze', p) };
// ... same pattern for incident, evidence, timeline services
```

### 7.3 Authentication Middleware

All routes are protected with `protect` middleware:
```javascript
// middleware/authMiddleware.js
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id).select('-password');
  next();
};
```

---

## 8. Frontend Dashboard (Next.js)

**Port:** 3000 | **Directory:** `frontend/app/(dashboard)/`

### 8.1 Page Map

| Page | Route | Feature |
|---|---|---|
| Dashboard | `/dashboard` | KPI metrics, Forensic Event Timeline, ML Health, Recent Events |
| Log Viewer | `/logs` | Full log table with anomaly highlighting, sort, filter |
| Incidents | `/incidents` | Incident cards with MITRE tags, status updates |
| Forensics | `/forensics` | Evidence chain viewer, Digital Notary, Chain Verification |
| Timeline | `/timeline` | DBSCAN cluster viewer, entity search, auto-analysis |
| Detection Rules | `/rules` | Rule list, import/export |
| System Tests | `/system-test` | 9-suite test runner with live pass/fail results |

### 8.2 Forensic Event Timeline Chart

The dashboard timeline chart uses a **ComposedChart** from Recharts:
- `<Area>` for normal traffic (cyan gradient)
- `<Bar>` for attack events (red bars) — visually distinguishes spikes
- Toggle between **Demo Data** (hardcoded, always looks great) and **Live Data** (from MongoDB)
- Stats row: Total Normal · Total Attacks · Attack Rate %

### 8.3 API Layer (`frontend/lib/api.js`)

All backend calls go through a single Axios instance:
```javascript
const API = axios.create({ baseURL: '/api', ... });
// Token injected via request interceptor
API.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});
```

---

## 9. Database Schema (MongoDB)

**Database:** `cloudforensics`

### LogEntry Collection
```
logId (unique) · ipAddress · method · url · statusCode
userAgent · eventType · source · isAnomaly · riskLevel
timestamp · sha256Hash · userId · metadata{}
```

### Incident Collection
```
alertId (unique) · title · description · severity
status (open|investigating|resolved|closed|contained)
mitreAttackId · mitreAttackName · sourceIp
affectedResources[] · correlatedEvents[]
recommendations[] · metadata{} · timestamps
```

### ForensicBlock Collection (MongoDB mirror)
```
blockIndex · logId · eventType · userId · action
timestamp · previousHash · blockHash · digitalSignature
integrityStatus (VALID|COMPROMISED)
```

---

## 10. System Test Runner

**9 Test Suites** available from the System Tests page:

| # | Suite | Endpoint | What It Tests |
|---|---|---|---|
| ① | Full System | `POST /smoke-test` | All 4 components in parallel (16 tests) |
| ② | Identity Only | `POST /smoke-test/component/1` | C1: Health · Anomaly · Normal · History |
| ③ | Incident Only | `POST /smoke-test/component/2` | C2: Health · Rules · Brute-force · Persist |
| ④ | Evidence Only | `POST /smoke-test/component/3` | C3: Health · Preserve · Verify · Stats |
| ⑤ | Timeline Only | `POST /smoke-test/component/4` | C4: Health · Analyze · Anomalies · Metrics |
| ⑥ | Health Check | `POST /smoke-test/health` | Uptime ping all 4 services |
| ⑦ | Security | `POST /smoke-test/security` | Attack scenarios across all services |
| ⑧ | Accuracy | `POST /smoke-test/accuracy` | True-positive / true-negative ML checks |
| ⑨ | Integration | `POST /smoke-test/integration` | E2E cross-service workflows |

Each test case returns:
```json
{ "name": "Test name", "status": "PASS|FAIL", "detail": "...", "durationMs": 142 }
```

---

## 11. Data Flow — End-to-End

### Scenario: Brute-force attack detected and preserved

```
1. Attacker sends 8 failed login requests
        ↓
2. Node.js backend receives log events via POST /api/logs
        ↓
3. Events forwarded to C1 (Port 8001) → anomaly flagged (CRITICAL)
        ↓
4. Events forwarded to C2 (Port 8002) → RULE-001 fires (brute force)
   → Incident created: { title, severity:HIGH, mitreId:T1110, sourceIp }
        ↓
5. Incident saved to MongoDB `incidents` collection
        ↓
6. Node.js calls C3 (Port 8003) POST /preserve
   → ForensicBlock created with SHA-256 hash + RSA-2048 signature
        ↓
7. Log events forwarded to C4 (Port 8004) POST /analyze
   → DBSCAN groups the 8 events into cluster #2 (brute force campaign)
        ↓
8. Dashboard refreshes:
   - KPI: +1 incident, +8 logs
   - Timeline chart: attack spike visible
   - Recent Incidents: new HIGH severity card
   - ML Health: all 4 services ● ONLINE
```

---

*Document generated for the Cloud Forensics Research Platform.*
*All components maintained independently by their respective authors.*

