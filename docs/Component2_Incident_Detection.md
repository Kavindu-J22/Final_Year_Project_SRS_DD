# ═══════════════════════════════════════════════════════════════════
# COMPONENT 2 — INCIDENT DETECTION & CORRELATION ENGINE
# ═══════════════════════════════════════════════════════════════════
**Student:** S. M. R. Rajapaksha (IT22033550)
**Service Port:** 8002 | **ML API:** `http://localhost:8002`
**Frontend Pages:** `/incidents` (Incident Cards) | `/store` (Rule Store)
**Backend Route:** `POST /api/incidents/correlate`
**Source Files:** `incident_detection/api.py` · `src/correlator.py` · `src/detector.py` · `rulebase.yaml`

---

## 1. RESEARCH NOVELTY

### What Makes This Component Novel?

| Novelty Aspect | Description |
|----------------|-------------|
| **MITRE ATT&CK Alignment** | Every rule maps to an official MITRE technique ID (T1110, T1078, T1003, etc.) — machine-readable, internationally standardised threat taxonomy |
| **Multi-Step Attack Correlation** | Events are not flagged individually; the Correlator groups events into time-windowed chains to detect kill-chain progressions (reconnaissance → exploitation → exfiltration) |
| **Live-Reloadable Rule Engine** | YAML rulebase can be updated via REST API `POST /rules/import` without restarting the service — critical for zero-downtime SOC operations |
| **Severity-Weighted Scoring** | Each incident carries a weighted severity score combining event frequency, time window compression, and MITRE tactic phase weight |
| **75-Rule / 12-Pattern Library** | Covers Brute Force (T1110), Insider Threat (T1078), Data Exfiltration (T1041), SQL Injection (T1190), Privilege Escalation (T1068), and 7 more |
| **Event Buffer Architecture** | In-memory `deque(maxlen=1000)` provides O(1) insertion with automatic eviction — real-time without database I/O latency |

### Research Gap Addressed
Traditional SIEM tools (Splunk, QRadar) require complex query languages and offline batch correlation. This component performs **real-time stateful correlation** using a streaming event buffer and YAML-configurable patterns — accessible to small-to-medium SOC teams without commercial licensing.

---

## 2. FRONTEND PAGES — WORKFLOW WITH NODE BACKEND & ML

### Page A: `/incidents` — Active Incident Dashboard

**User Journey:**
```
Auto-refresh OR Submit Events → Node API → ML Correlator → Incident Cards render
```

**Workflow:**
```
[Browser /incidents]
        │
        │  POST  events[] JSON
        ▼
[Node.js :5000]  POST /api/incidents/correlate
        │   incidentService.correlateEvents(events)
        │   → axios.post('http://localhost:8002/correlate', { events })
        ▼
[Python FastAPI :8002]  POST /correlate
        │
        │  For each event: correlator.process_event(event)
        │    → _buffer.append(event)
        │    → check_brute_force(_buffer)    T1110
        │    → check_insider_threat(_buffer) T1078
        │    → Rule engine: _matches_rule for each YAML rule
        │  Deduplicate incidents
        ▼
[JSON] incidents: [{id, type, severity, mitre_technique, event_count, ...}]
        ▼
[React] Renders IncidentCard components with severity badges
        Filters by: severity, status, MITRE technique
```

### Page B: `/store` — Rule Store (Import/Export/Browse)

**User Journey:**
```
View Rules → Filter by MITRE technique → Import custom YAML rule → See it in Active Rules
```

**Workflow:**
```
[Browser /store]
        │
        │  GET  /api/incidents/rules
        ▼
[Node.js]  GET /api/incidents/rules
        │  → ruleService.getRules()
        │  → axios.get('http://localhost:8002/rules')
        ▼
[FastAPI :8002]  GET /rules
        │  Returns all 75 loaded rules from rulebase.yaml
        ▼
[React] Renders rule cards with MITRE technique, severity, threshold
        User clicks "Import Rule" → POST /rules/import with new YAML
        Rule appears immediately in active detections
```

---

## 3. HOW IT WORKS — LOGICS & FUNCTIONS

### 3.1 Event Ingestion & Buffer (`api.py`)

```python
EVENT_BUFFER: deque = deque(maxlen=1000)  # O(1) insert, auto-eviction

@app.post("/ingest")
async def ingest_event(event: LogEvent):
    EVENT_BUFFER.append(event.dict())      # Add to rolling buffer
    incidents = check_brute_force(EVENT_BUFFER)      # Pattern check
    incidents += check_insider_threat(EVENT_BUFFER)  # Pattern check
    return {"incidents_triggered": incidents}
```

### 3.2 Brute Force Detection (`api.py` → `check_brute_force`)

**MITRE T1110:** Credential stuffing / password attacks

```python
def check_brute_force(buffer):
    user_failures = defaultdict(list)
    for event in buffer:
        if event['event_type'] == 'FailedLogin':
            user_failures[event['user_id']].append(event)

    incidents = []
    for user, failures in user_failures.items():
        if len(failures) >= 5:            # Threshold: 5 failures
            incidents.append(IncidentAlert(
                severity="CRITICAL",
                title="Brute Force Attack Detected",
                mitre_technique="T1110 - Brute Force",
                affected_user=user,
                recommendations=["Lock account", "Investigate source IP", "Enable MFA"]
            ))
    return incidents
```

### 3.3 Insider Threat Detection (`api.py` → `check_insider_threat`)

**MITRE T1078:** Valid accounts misused during off-hours

```python
def check_insider_threat(buffer):
    off_hours_events = defaultdict(list)
    for event in buffer:
        if event['event_type'] in ['FileAccess', 'DataDownload']:
            hour = datetime.fromisoformat(event['timestamp']).hour
            if hour >= 22 or hour <= 5:    # 10 PM to 5 AM
                off_hours_events[event['user_id']].append(event)

    for user, events in off_hours_events.items():
        if len(events) >= 3:              # 3+ off-hours events = suspicious
            yield IncidentAlert(severity="HIGH", mitre_technique="T1078 - Valid Accounts")
```

### 3.4 YAML Rule Engine (`src/detector.py` → `RuleEngine._matches_rule`)

```python
def _matches_rule(self, event: dict, rule: dict) -> bool:
    # Check event_type matches
    if rule.get('event_type') and event.get('event_type') != rule['event_type']:
        return False
    # Check metadata conditions
    for key, value in rule.get('conditions', {}).items():
        if event.get('metadata', {}).get(key) != value:
            return False
    return True
```

### 3.5 Multi-Event Correlation (`src/correlator.py` → `Correlator.process_event`)

```python
def process_event(self, event: dict):
    self._buffer.append(event)
    # Group events into attack chains by user + IP within time window
    chains = self._build_attack_chains(self._buffer)
    for chain in chains:
        if self._chain_is_suspicious(chain):
            self._emit_correlated_incident(chain)

def _build_attack_chains(self, buffer):
    # Slide 5-minute windows over buffer
    # Group: same user OR same source IP
    # Return: sequences of related events
```

### 3.6 Rule Loading from YAML (`api.py` → `load_rules`)

```python
def load_rules():
    with open("rulebase.yaml") as f:
        data = yaml.safe_load(f)
    rules = []
    for rule in data.get('rules', []):
        rules.append({
            'id': rule['id'],           # T1110, T1078, etc.
            'name': rule['name'],
            'severity': rule['severity'],
            'threshold': rule['threshold'],
            'time_window': rule.get('time_window_seconds', 300),
            'event_types': rule.get('event_types', []),
            'conditions': rule.get('conditions', {})
        })
    return rules
```

### 3.7 MITRE ATT&CK Rules (rulebase.yaml — sample)

| Rule ID | Name | Severity | Threshold | Window |
|---------|------|----------|-----------|--------|
| T1110 | Brute Force Attack | HIGH | 5 events | 60s |
| T1078 | Valid Accounts Misuse | MEDIUM | 3 events | 300s |
| T1041 | Data Exfiltration via C2 | CRITICAL | 1 event | 60s |
| T1190 | Exploit Public-Facing App (SQLi) | HIGH | 3 events | 120s |
| T1068 | Privilege Escalation | CRITICAL | 1 event | 30s |
| T1486 | Ransomware — Data Encrypted | CRITICAL | 1 event | 30s |
| T1059 | Command & Scripting Interpreter | MEDIUM | 3 events | 120s |
| T1021 | Remote Services Abuse | HIGH | 1 event | 60s |

---

## 4. API ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health, rules_loaded, buffer_size |
| POST | `/ingest` | Ingest single event → triggers pattern checks |
| POST | `/correlate` | Correlate batch of events in time window |
| GET | `/incidents?limit=N` | Recent N incidents |
| GET | `/rules` | Active detection rules |
| GET | `/store` | Full rule catalogue |
| POST | `/import-rules` | Merge new YAML rules live |
| GET | `/export-rules` | Export rulebase as JSON |
| DELETE | `/rules/{rule_id}` | Remove rule by ID |

---

## 5. FILE STRUCTURE

```
incident_detection/
├── api.py              ← FastAPI app, check_brute_force, check_insider_threat, correlate endpoint
├── rulebase.yaml       ← 75 MITRE ATT&CK detection rules
├── src/
│   ├── detector.py     ← RuleEngine._matches_rule, load_all_rules
│   └── correlator.py  ← Correlator.process_event, _build_attack_chains
├── test_data/          ← Sample event payloads for demo
└── integration_test.py ← End-to-end test script
```

---

## 6. RESEARCH PANEL PRESENTATION GUIDE

### How to Present This Component

**Step 1 — Open the Incidents Page**
Navigate to `http://localhost:3000/incidents`. Say: *"This is the Incident Detection dashboard showing all correlated security incidents mapped to MITRE ATT&CK techniques."*

**Step 2 — Demonstrate Brute Force Detection**
Go to `http://localhost:8002/docs` → POST `/correlate` with:
```json
{
  "events": [
    {"event_id":"e1","timestamp":"2026-01-05T03:45:00Z","event_type":"FailedLogin","user_id":"admin@test.com","source_ip":"203.0.113.42","resource":"/login","metadata":{}},
    {"event_id":"e2","timestamp":"2026-01-05T03:45:01Z","event_type":"FailedLogin","user_id":"admin@test.com","source_ip":"203.0.113.42","resource":"/login","metadata":{}},
    {"event_id":"e3","timestamp":"2026-01-05T03:45:02Z","event_type":"FailedLogin","user_id":"admin@test.com","source_ip":"203.0.113.42","resource":"/login","metadata":{}},
    {"event_id":"e4","timestamp":"2026-01-05T03:45:03Z","event_type":"FailedLogin","user_id":"admin@test.com","source_ip":"203.0.113.42","resource":"/login","metadata":{}},
    {"event_id":"e5","timestamp":"2026-01-05T03:45:04Z","event_type":"FailedLogin","user_id":"admin@test.com","source_ip":"203.0.113.42","resource":"/login","metadata":{}}
  ],
  "time_window_minutes": 5
}
```
Show result: `mitre_technique: "T1110 - Brute Force"`, `severity: CRITICAL`

**Step 3 — Open the Rule Store (`/store`)**
Say: *"The Rule Store shows all 75 MITRE ATT&CK rules. SOC analysts can import new rules live without restarting."*

**Step 4 — Show Key Code Files**
Open `incident_detection/api.py`:
- Point to `check_brute_force()` — user failure grouping logic
- Point to `check_insider_threat()` — off-hours (22:00-05:00) check
- Point to `load_rules()` — YAML loading

Open `incident_detection/rulebase.yaml`:
- Show T1110, T1078 rule definitions with threshold + time window

**Step 5 — Show the MITRE Mapping**
Say: *"Every alert has a MITRE technique ID. This makes our output compatible with international threat intelligence sharing standards (STIX/TAXII)."*

**Key Talking Points:**
1. *"Real-time event buffer — O(1) insertion, no database I/O latency."*
2. *"Multi-step correlation detects attack chains, not just individual events."*
3. *"75 MITRE ATT&CK rules cover 12 attack patterns out of the box."*
4. *"Live-reloadable rules — zero-downtime rule updates."*
5. *"Recommendations included in every alert — actionable intelligence, not just detection."*

---

## 7. HOW TO START THE SERVICE

```powershell
cd incident_detection
uvicorn api:app --host 0.0.0.0 --port 8002 --reload
# Swagger UI: http://localhost:8002/docs
```

---

## 3. MITRE ATT&CK Rules (rulebase.yaml)

| Rule ID | Name | Severity | Threshold | Window |
|---------|------|----------|-----------|--------|
| T1110 | Brute Force Attack | HIGH | 5 events | 60 s |
| T1078 | Valid Accounts Misuse | MEDIUM | 1 event | 300 s |
| T1485 | Data Destruction | CRITICAL | 1 event | 60 s |
| T1110.001 | Password Spraying | HIGH | 10 events | 60 s |
| T1059 | Command & Scripting Interpreter | MEDIUM | 3 events | 120 s |
| T1021 | Remote Services Abuse | HIGH | 1 event | 60 s |
| T1071 | C2 via Standard Protocols | CRITICAL | 5 events | 300 s |
| T1486 | Ransomware – Data Encrypted | CRITICAL | 1 event | 30 s |

---

## 4. Data Models

### LogEvent (input)
```json
{
  "event_id": "evt_00001",
  "timestamp": "2026-01-05T03:45:00Z",
  "event_type": "FailedLogin",
  "user_id": "admin@company.com",
  "source_ip": "203.0.113.42",
  "resource": "/api/v1/login",
  "metadata": { "attempt": 1 }
}
```

### IncidentAlert (output)
```json
{
  "alert_id": "INC-00001",
  "severity": "CRITICAL",
  "title": "Brute Force Attack Detected",
  "description": "Detected 7 failed login attempts",
  "mitre_technique": "T1110 - Brute Force",
  "affected_user": "admin@company.com",
  "source_events": ["evt_00001", "evt_00002"],
  "timestamp": "2026-01-05T03:45:10.000000",
  "recommendations": ["Lock affected account", "Investigate source IP", "Enable MFA"]
}
```

---

## 5. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health — `rules_loaded`, `buffer_size`, `api_version` |
| POST | `/ingest` | Ingest single event into buffer; returns any triggered alerts |
| POST | `/correlate` | Correlate a batch of events within a time window |
| GET | `/incidents?limit=N` | Recent incidents from in-memory buffer |
| GET | `/rules` | Active detection rules |
| GET | `/store` | Full rule catalogue (active + importable) |
| POST | `/import-rules` | Merge new rules into active rulebase |
| GET | `/export-rules` | Export current rulebase as JSON |
| DELETE | `/rules/{rule_id}` | Remove a rule by ID |
| GET | `/sample-data/brute-force` | 10 FailedLogin events for demo |
| GET | `/sample-data/insider` | 5 off-hours FileAccess events for demo |

### POST `/correlate` — Request
```json
{
  "events": [ /* array of LogEvent */ ],
  "time_window_minutes": 10
}
```

---

## 6. File Structure
```
incident_detection/
├── api.py              # FastAPI application
├── rulebase.yaml       # MITRE ATT&CK detection rules
├── src/                # (extended rule engine modules)
├── test_data/          # Sample event payloads for testing
└── integration_test.py # Integration test script
```

---

## 7. State Management
All state is in-memory per service instance:
- `EVENT_BUFFER` — `deque(maxlen=1000)` rolling event log
- `RULES_CACHE` — active detection rules list  
- `RECENT_INCIDENTS` — list of triggered `IncidentAlert` objects
- `INCIDENT_COUNTER` — sequential alert ID counter

---

## 8. Integration with Main Application
- Backend `incidentService` in `mlService.js` bridges to all incident endpoints
- `POST /api/logs/ingest` → calls `incidentService.ingestEvent()` in real-time
- `POST /api/incidents/correlate` → calls `incidentService.correlateEvents()`
- Incidents are also saved to MongoDB `Incident` collection for dashboard aggregation
- Frontend Incidents page at `/incidents` shows all alerts with status management

---

## 9. How to Start
```powershell
cd incident_detection
.\.venv\Scripts\uvicorn api:app --host 0.0.0.0 --port 8002 --reload
# Swagger UI: http://localhost:8002/docs
```

