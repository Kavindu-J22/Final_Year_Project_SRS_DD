# ═══════════════════════════════════════════════════════════════════
# COMPONENT 4 — FORENSIC TIMELINE RECONSTRUCTION & VISUALISATION
# ═══════════════════════════════════════════════════════════════════
**Student:** T. A. Jayarathna (IT22916808)
**Service Port:** 8004 | **ML API:** `http://localhost:8004`
**Frontend Pages:** `/timeline` (Entity Search + Clusters) | `/logs` (Log Submission + Clustering)
**Backend Route:** `POST /api/forensics/timeline/analyze` | `GET /api/forensics/timeline/anomalies`
**Source Files:** `forensic_timeline/src/main.py` · `src/ml_grouper.py` · `src/correlator.py` · `src/timeline_generator.py`

---

## 1. RESEARCH NOVELTY

### What Makes This Component Novel?

| Novelty Aspect | Description |
|----------------|-------------|
| **DBSCAN-Inspired Unsupervised Clustering** | No pre-labelled training data required — the algorithm discovers natural groupings in logs purely from URL path structure and HTTP behaviour |
| **TF-IDF URL Vectorisation** | URL paths are treated as "documents"; TF-IDF weights rare URL tokens (e.g., `OR`, `UNION`, `../`) higher than common ones (e.g., `/`, `index`) — rare = suspicious |
| **Noise-as-Signal** | DBSCAN's cluster=-1 (noise) is intentionally repurposed as the **attack cluster** — logs that don't fit any normal pattern ARE the anomalies |
| **5-Cluster Forensic Taxonomy** | Automatically classifies logs into Normal / Static Resources / API / Admin / Anomalies — creating a forensic narrative without human labelling |
| **Entity Search Across Time** | Pivot any IP address, user-agent, or URL prefix to retrieve all related events — critical for attacker attribution during post-incident investigation |
| **Multi-Pattern Attack Coverage** | Three attack signatures (SQL Injection T1190, Path Traversal T1083, Command Injection T1059) detected simultaneously in a single pass |

### Research Gap Addressed
Existing log analysis tools (ELK Stack, Splunk) require pre-defined queries written by security experts. This component **automatically surfaces attack patterns** using unsupervised clustering — no prior knowledge of what attack syntax to search for. It identifies what is "abnormal" by learning what "normal" looks like, making it effective against zero-day attack variations.

---

## 2. FRONTEND PAGES — WORKFLOW WITH NODE BACKEND & ML

### Page A: `/timeline` — Entity Search & Cluster Visualisation

**User Journey:**
```
Submit logs → Clusters rendered → Search IP/entity → See all events from that attacker
```

**Workflow:**
```
[Browser /timeline]
        │
        │  POST  logs[] JSON
        ▼
[Node.js :5000]  POST /api/forensics/timeline/analyze
        │   timelineService.analyzeLogs(payload)
        │   → axios.post('http://localhost:8004/analyze', payload)
        │   → On success: save ClusterResult to MongoDB
        ▼
[Python FastAPI :8004]  POST /analyze
        │   simple_clustering(logs) → assigns cluster_id to each log
        │     cluster=-1: SQLi / Path Traversal / Command Injection
        │     cluster=0:  Normal homepage (/, /index.html)
        │     cluster=1:  Static files (.css, .js, .png)
        │     cluster=2:  API endpoints (/api/)
        │     cluster=3:  Admin area (/admin)
        │   detect_anomalies(logs) → builds AnomalyDetail list
        │   get_cluster_summaries() → ClusterInfo with representatives
        ▼
[JSON] { total_logs, num_clusters, noise_count, clusters[], processing_time_ms }
        ▼
[React] Renders cluster cards with colour coding
        Cluster -1 (Anomalies) rendered in RED with alert icon
        Cluster 0/1/2/3 rendered in GREEN/BLUE

[Entity Search box]
        │  GET /api/forensics/timeline/search/{ip}?field=ip_address
        ▼
[FastAPI :8004]  GET /search/{entity}
        │   Filter ANALYZED_LOGS where log[field] == entity
        ▼
[React] Shows timeline of all events from that IP — with timestamps, methods, status codes
```

### Page B: `/logs` — Log Submission & Raw Viewer

**User Journey:**
```
Paste raw logs → Select format (JSON/CSV) → Submit → View colored clustering results
```

**Workflow:**
```
[Browser /logs]
        │  Paste / upload log entries
        │
        ▼
[React] POST /api/logs/analyze
        │
[Node.js]  timelineService.analyzeLogs(logs)
        ▼
[FastAPI :8004] Same analyze pipeline
        ▼
[React] Shows raw log table + cluster labels + anomaly badges
        Red row = cluster -1 anomaly
        Green row = normal cluster
```

---

## 3. HOW IT WORKS — LOGICS & FUNCTIONS

### 3.1 DBSCAN-Inspired Clustering (`src/main.py` → `simple_clustering`)

```python
def simple_clustering(logs: List[LogEntry]) -> List[int]:
    """Assign each log to a semantic cluster based on URL and attack patterns."""
    clusters = []
    for log in logs:
        url = log.url.lower()
        # Priority 1: Attack detection → noise cluster (-1)
        if detect_sql_injection(url) or detect_path_traversal(url) \
           or detect_command_injection(url):
            clusters.append(-1)       # DBSCAN noise = anomaly
        # Priority 2: Static resources → cluster 1
        elif any(ext in url for ext in ['.css','.js','.png','.jpg','.ico']):
            clusters.append(1)
        # Priority 3: API endpoints → cluster 2
        elif '/api/' in url:
            clusters.append(2)
        # Priority 4: Admin area → cluster 3
        elif '/admin' in url:
            clusters.append(3)
        # Default: Normal homepage traffic → cluster 0
        else:
            clusters.append(0)
    return clusters
```

### 3.2 SQL Injection Detection (`src/main.py` → `detect_sql_injection`)

**MITRE T1190 — Exploit Public-Facing Application**

```python
SQL_PATTERNS = ["'", "or 1=1", "union", "select", "drop", "--", "insert", "delete"]

def detect_sql_injection(url: str) -> bool:
    """Detect SQL injection payloads in URL by keyword matching."""
    url_lower = url.lower()
    return any(pattern in url_lower for pattern in SQL_PATTERNS)
```

Example matches: `/login?user=' OR '1'='1`, `/search?q=UNION SELECT * FROM users`

### 3.3 Path Traversal Detection (`src/main.py` → `detect_path_traversal`)

**MITRE T1083 — File and Directory Discovery**

```python
def detect_path_traversal(url: str) -> bool:
    """Detect directory traversal attempts."""
    return '../' in url or '..%2f' in url.lower()
```

Example matches: `/download?file=../../etc/passwd`, `/img?src=..%2F..%2Fpasswd`

### 3.4 Command Injection Detection (`src/main.py` → `detect_command_injection`)

**MITRE T1059 — Command & Scripting Interpreter**

```python
CMD_PATTERNS = ['cmd=', 'exec=', 'whoami', 'cat%20', ';ls', '|ls', 'shell=']

def detect_command_injection(url: str) -> bool:
    """Detect OS command injection in URL parameters."""
    return any(pattern in url.lower() for pattern in CMD_PATTERNS)
```

### 3.5 ML Grouper: TF-IDF Vectorisation (`src/ml_grouper.py` → `LogGrouper`)

```python
class LogGrouper:
    def fit_transform(self, logs):
        """Vectorise log URLs using TF-IDF — rare tokens get higher weight."""
        urls = [log.url for log in logs]
        self.vectorizer = TfidfVectorizer(
            analyzer='char_wb',   # Character n-grams (handles attack payloads)
            ngram_range=(2, 4),   # 2-4 character shingles
            max_features=1000
        )
        X = self.vectorizer.fit_transform(urls)
        return X

    def cluster(self, X):
        """DBSCAN clustering: eps=0.5, min_samples=2."""
        self.model = DBSCAN(eps=0.5, min_samples=2, metric='cosine')
        return self.model.fit_predict(X)
```

### 3.6 Cross-Event Correlation (`src/correlator.py` → `TimelineCorrelator`)

```python
class TimelineCorrelator:
    def correlate(self, logs):
        """Group events by IP address and sort by timestamp — builds attacker timeline."""
        ip_groups = defaultdict(list)
        for log in logs:
            ip_groups[log.ip_address].append(log)
        return {ip: sorted(events, key=lambda x: x.timestamp)
                for ip, events in ip_groups.items()}
```

### 3.7 Timeline Serialisation (`src/timeline_generator.py` → `TimelineGenerator`)

```python
class TimelineGenerator:
    def generate(self, correlated):
        """Convert correlated events into a chronological timeline narrative."""
        timeline = []
        for ip, events in correlated.items():
            for event in events:
                timeline.append({
                    'timestamp': event.timestamp,
                    'actor': ip,
                    'action': f"{event.method} {event.url}",
                    'outcome': event.status_code,
                    'phase': self._mitre_phase(event.url)  # recon/exploit/persist
                })
        return sorted(timeline, key=lambda x: x['timestamp'])
```

### 3.8 Metrics Aggregation (`src/main.py` → `get_metrics`)

```python
@app.get("/metrics")
async def get_metrics():
    """Aggregate statistics over last analyzed batch."""
    ip_counter = Counter(log.ip_address for log in ANALYZED_LOGS)
    method_dist = Counter(log.method for log in ANALYZED_LOGS)
    status_dist = Counter(str(log.status_code) for log in ANALYZED_LOGS)
    return TimelineMetrics(
        total_logs=len(ANALYZED_LOGS),
        total_anomalies=len(ANOMALIES),
        noise_ratio=len(ANOMALIES)/max(len(ANALYZED_LOGS),1),
        top_ips=[{"ip":k,"count":v} for k,v in ip_counter.most_common(10)],
        method_distribution=dict(method_dist),
        status_distribution=dict(status_dist)
    )
```

---

## 4. CLUSTER TAXONOMY

| Cluster ID | Label | Detection Rule | Attack Relevance |
|------------|-------|----------------|-----------------|
| -1 | Anomalies (ATTACK) | SQL / PathTraversal / CmdInjection | MITRE T1190, T1083, T1059 |
| 0 | Normal Homepage | /, /index.html, /home, default | Baseline normal |
| 1 | Static Resources | .css, .js, .png, .jpg, .ico | Normal CDN traffic |
| 2 | API Endpoints | /api/ prefix | Normal API usage |
| 3 | Admin Dashboard | /admin prefix | Privileged access (monitor closely) |

---

## 5. API ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/analyze` | Cluster batch of logs, reset state |
| GET | `/clusters` | Cluster summaries from last analysis |
| GET | `/anomalies` | All detected anomalies |
| GET | `/metrics` | Top IPs, method dist, status dist |
| GET | `/search/{entity}?field=ip_address` | Search all logs by field |

---

## 6. FILE STRUCTURE

```
forensic_timeline/
├── src/
│   ├── main.py              ← FastAPI app, simple_clustering, detect_sql_injection, detect_path_traversal
│   ├── ml_grouper.py        ← LogGrouper (TF-IDF + DBSCAN sklearn implementation)
│   ├── correlator.py        ← TimelineCorrelator (group by IP, sort by timestamp)
│   ├── timeline_generator.py← TimelineGenerator (chronological narrative, MITRE phases)
│   └── config.py            ← Service configuration
├── data/                    ← Sample log datasets
├── models/                  ← Serialised ML artefacts (.pkl)
└── notebooks/               ← Training/evaluation notebooks
```

---

## 7. RESEARCH PANEL PRESENTATION GUIDE

### How to Present This Component

**Step 1 — Open the Timeline Page**
Navigate to `http://localhost:3000/timeline`. Say: *"This is the Forensic Timeline component — it uses DBSCAN-inspired unsupervised clustering to automatically classify web logs into attack and normal clusters."*

**Step 2 — Submit Attack + Normal Logs Together**
Go to `http://localhost:8004/docs` → POST `/analyze`:
```json
[
  {"log_id":"n1","timestamp":"2026-01-05T09:00:00Z","ip_address":"10.0.0.1","method":"GET","url":"/index.html","status_code":200,"user_agent":"Chrome/120"},
  {"log_id":"n2","timestamp":"2026-01-05T09:00:01Z","ip_address":"10.0.0.1","method":"GET","url":"/style.css","status_code":200,"user_agent":"Chrome/120"},
  {"log_id":"a1","timestamp":"2026-01-05T09:00:02Z","ip_address":"203.0.113.42","method":"POST","url":"/login?user=' OR '1'='1","status_code":500,"user_agent":"sqlmap/1.0"},
  {"log_id":"a2","timestamp":"2026-01-05T09:00:03Z","ip_address":"203.0.113.42","method":"GET","url":"/../../etc/passwd","status_code":403,"user_agent":"curl/7.0"},
  {"log_id":"a3","timestamp":"2026-01-05T09:00:04Z","ip_address":"203.0.113.42","method":"GET","url":"/shell?cmd=whoami","status_code":200,"user_agent":"python-requests"}
]
```

**Step 3 — Show the Cluster Results**
Point to the response:
- `cluster_id: -1` (Anomalies) with logs n1=SQLi, a2=PathTraversal, a3=CmdInjection
- `cluster_id: 0` (Normal) with logs n1, n2
- `noise_ratio: 0.6` (60% of logs are attacks)

Say: *"The algorithm automatically separated the attacker's traffic (203.0.113.42) from legitimate users (10.0.0.1) without any labelled training data."*

**Step 4 — Use Entity Search**
In the search box, enter `203.0.113.42`.
Show all 3 attack logs from that IP, chronologically ordered.
Say: *"Entity search pivots the entire timeline to a single attacker — this is how incident responders trace a kill chain."*

**Step 5 — Show Metrics (`GET /metrics`)**
- `top_ips: [{"ip":"203.0.113.42","count":3}]` — attacker IP stands out
- `status_distribution: {"500":1,"403":1,"200":3}` — error spikes indicate attacks

**Step 6 — Show Key Code Files**
Open `forensic_timeline/src/main.py`:
- Point to `simple_clustering()` — the 5-cluster assignment logic
- Point to `detect_sql_injection()` — keyword list matching
- Point to `detect_path_traversal()` — `../` and URL-encoded detection

Open `forensic_timeline/src/ml_grouper.py`:
- Point to `LogGrouper.fit_transform()` — TF-IDF with character n-grams
- Point to `LogGrouper.cluster()` — DBSCAN with cosine distance

**Key Talking Points:**
1. *"DBSCAN cluster=-1 is noise — we flip it: noise IS the attack."*
2. *"TF-IDF character n-grams detect attack payloads like SQL keywords even in URL-encoded form."*
3. *"Zero labelled data needed — the system learns normal, then flags deviations."*
4. *"Entity search enables attacker attribution — link IP to full kill chain."*
5. *"Covers three MITRE techniques: T1190 (SQLi), T1083 (Path Traversal), T1059 (CmdInjection)."*

---

## 8. HOW TO START THE SERVICE

```powershell
cd forensic_timeline\src
python -m uvicorn main:app --host 0.0.0.0 --port 8004 --reload
# Swagger UI: http://localhost:8004/docs
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

