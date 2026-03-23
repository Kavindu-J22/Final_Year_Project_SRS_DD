# Component 2 — Incident Detection & Correlation
**Student:** IT22033550  |  **Service Port:** 8002  |  **API Base:** `http://localhost:8002`

---

## 1. Overview
Component 2 is a **real-time threat detection and event correlation engine** aligned with the MITRE ATT&CK framework. It ingests raw log events, correlates them within configurable time windows, and generates structured incident alerts when attack patterns are detected. The rule engine is fully configurable via YAML and exposes a Rule Store for importing/exporting detection rules without restarting the service.

---

## 2. Detection Architecture

```
Raw Events ──► Event Buffer (deque 1000) ──► Pattern Checkers ──► IncidentAlert
                                                     │
                                              YAML Rulebase
                                         (rulebase.yaml loaded at startup)
```

**Pattern checkers implemented:**
- `check_brute_force()` — MITRE T1110: ≥ 5 failed login events from same user
- `check_insider_threat()` — MITRE T1078: ≥ 3 off-hours (22:00–05:00) file access events

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

