# API Guide: Incident Detection & Correlation
**Component 2 - IT22033550**  
**Port:** 8002  
**Base URL:** http://localhost:8002

---

## 🎯 Overview

This API implements MITRE ATT&CK-based threat detection with event correlation capabilities. It analyzes cloud logs in real-time to detect brute force attacks, insider threats, and other security incidents based on predefined rules and behavioral patterns.

**Technology Stack:**
- **Framework:** FastAPI
- **Detection:** MITRE ATT&CK framework
- **Buffer Size:** 1,000 events (sliding window)
- **Response Time:** <25ms per event

---

## 🚀 Starting the API

### Auto-Start
```bash
./start_all_apis.sh
```

### Manual Start
```bash
cd incident_detection
source ../test_venv/bin/activate
uvicorn api:app --port 8002 --reload
```

### Verify
```bash
curl http://localhost:8002
```

---

## 📖 API Endpoints

### 1. Health Check

**Endpoint:** `GET /`

#### Sample Request
```http
GET http://localhost:8002/
```

#### Sample Response
```json
{
  "status": "healthy",
  "rules_loaded": 3,
  "buffer_size": 0,
  "api_version": "1.0.0"
}
```

**Explanation:**
- **rules_loaded:** Number of MITRE ATT&CK detection rules
- **buffer_size:** Current events in correlation buffer

#### Swagger UI Test
1. Open: http://localhost:8002/docs
2. Find: `GET /` endpoint
3. Click: "Try it out" → "Execute"
4. ✅ Verify: `"status": "healthy"`

---

### 2. Ingest Single Event

**Endpoint:** `POST /ingest`  
**Purpose:** Submit single log event for real-time detection

#### Input Schema
```json
{
  "event_id": "string",           // Required: Unique event identifier
  "timestamp": "ISO 8601 string", // Required: When event occurred
  "event_type": "string",         // Required: Type (FailedLogin, FileAccess, etc.)
  "user_id": "string",            // Required: User identifier
  "source_ip": "string",          // Required: Source IP address
  "resource": "string",           // Optional: Resource accessed
  "metadata": {}                  // Optional: Additional data
}
```

#### Sample Input 1: Normal Login
```json
{
  "event_id": "evt_00001",
  "timestamp": "2026-01-05T14:30:00Z",
  "event_type": "SuccessfulLogin",
  "user_id": "alice@company.com",
  "source_ip": "192.168.1.100",
  "resource": "/dashboard",
  "metadata": {
    "browser": "Chrome",
    "os": "Windows 10"
  }
}
```

**Expected Output:**
```json
{
  "status": "ingested",
  "event_id": "evt_00001",
  "buffer_size": 1,
  "alerts_triggered": 0,
  "alerts": []
}
```

**Explanation:**
- **status:** "ingested" = Event successfully processed
- **buffer_size:** Now 1 event in memory
- **alerts_triggered:** 0 = No attack detected
- **alerts:** Empty array = No incidents

#### Sample Input 2: Failed Login (Part of Brute Force)
```json
{
  "event_id": "evt_bf_001",
  "timestamp": "2026-01-05T03:45:10Z",
  "event_type": "FailedLogin",
  "user_id": "admin@company.com",
  "source_ip": "203.0.113.42",
  "resource": "/api/v1/login",
  "metadata": {
    "attempt": 1,
    "reason": "Invalid password"
  }
}
```

**Expected Output (after 5th failed login):**
```json
{
  "status": "ingested",
  "event_id": "evt_bf_005",
  "buffer_size": 5,
  "alerts_triggered": 1,
  "alerts": [
    {
      "alert_id": "INC-00001",
      "severity": "CRITICAL",
      "title": "Brute Force Attack Detected",
      "description": "Detected 5 failed login attempts",
      "mitre_technique": "T1110 - Brute Force",
      "affected_user": "admin@company.com",
      "source_events": ["evt_bf_001", "evt_bf_002", "evt_bf_003", "evt_bf_004", "evt_bf_005"],
      "timestamp": "2026-01-05T03:45:20.123Z",
      "recommendations": [
        "Lock affected account",
        "Investigate source IP",
        "Enable MFA"
      ]
    }
  ]
}
```

**Explanation:**
- **alerts_triggered:** 1 = ATTACK DETECTED!
- **severity:** CRITICAL = Highest priority
- **mitre_technique:** T1110 = Brute Force attack
- **recommendations:** Actions to take

#### Swagger UI Test Steps

1. **Navigate:** http://localhost:8002/docs
2. **Find:** `POST /ingest`
3. **Click:** "Try it out"
4. **Test Normal Event:**
   - Paste Sample Input 1
   - Execute
   - ✅ Verify `alerts_triggered: 0`

5. **Test Attack Detection:**
   - Submit Sample Input 2 **five times** (change event_id each time: evt_bf_001, evt_bf_002, etc.)
   - On 5th submission, verify `alerts_triggered: 1`
   - ✅ Check `mitre_technique: "T1110 - Brute Force"`

---

### 3. Correlate Multiple Events

**Endpoint:** `POST /correlate`  
**Purpose:** Analyze batch of events for attack patterns

#### Input Schema
```json
{
  "events": [                     // Required: Array of LogEvent objects (min 2)
    {/* LogEvent 1 */},
    {/* LogEvent 2 */},
    ...
  ],
  "time_window_minutes": 30       // Optional: Correlation window (1-120), default=30
}
```

#### Sample Input: Brute Force Pattern
```json
{
  "events": [
    {
      "event_id": "evt_10", "timestamp": "2026-01-05T03:45:10Z",
      "event_type": "FailedLogin", "user_id": "admin@company.com",
      "source_ip": "203.0.113.42", "resource": "/login"
    },
    {
      "event_id": "evt_11", "timestamp": "2026-01-05T03:45:12Z",
      "event_type": "FailedLogin", "user_id": "admin@company.com",
      "source_ip": "203.0.113.42", "resource": "/login"
    },
    {
      "event_id": "evt_12", "timestamp": "2026-01-05T03:45:15Z",
      "event_type": "FailedLogin", "user_id": "admin@company.com",
      "source_ip": "203.0.113.42", "resource": "/login"
    },
    {
      "event_id": "evt_13", "timestamp": "2026-01-05T03:45:17Z",
      "event_type": "FailedLogin", "user_id": "admin@company.com",
      "source_ip": "203.0.113.42", "resource": "/login"
    },
    {
      "event_id": "evt_14", "timestamp": "2026-01-05T03:45:20Z",
      "event_type": "FailedLogin", "user_id": "admin@company.com",
      "source_ip": "203.0.113.42", "resource": "/login"
    }
  ],
  "time_window_minutes": 30
}
```

**Expected Output:**
```json
[
  {
    "alert_id": "INC-00002",
    "severity": "CRITICAL",
    "title": "Brute Force Attack Detected",
    "description": "Detected 5 failed login attempts",
    "mitre_technique": "T1110 - Brute Force",
    "affected_user": "admin@company.com",
    "source_events": ["evt_10", "evt_11", "evt_12", "evt_13", "evt_14"],
    "timestamp": "2026-01-05T03:00:00.789Z",
    "recommendations": [
      "Lock affected account",
      "Investigate source IP",
      "Enable MFA"
    ]
  }
]
```

**Explanation:**
- Returns **array** of incidents (can be multiple!)
- Correlates events within time window
- Detects patterns across submitted events

#### Sample Input: Insider Threat Pattern
```json
{
  "events": [
    {
      "event_id": "evt_it_01", "timestamp": "2026-01-05T02:15:00Z",
      "event_type": "FileAccess", "user_id": "john.doe@company.com",
      "source_ip": "10.0.1.50", "resource": "/confidential/salaries.xlsx"
    },
    {
      "event_id": "evt_it_02", "timestamp": "2026-01-05T02:18:00Z",
      "event_type": "Download", "user_id": "john.doe@company.com",
      "source_ip": "10.0.1.50", "resource": "/confidential/client_list.db"
    },
    {
      "event_id": "evt_it_03", "timestamp": "2026-01-05T02:22:00Z",
      "event_type": "FileAccess", "user_id": "john.doe@company.com",
      "source_ip": "10.0.1.50", "resource": "/confidential/patents.pdf"
    }
  ],
  "time_window_minutes": 60
}
```

**Expected Output:**
```json
[
  {
    "alert_id": "INC-00003",
    "severity": "HIGH",
    "title": "Potential Insider Threat",
    "description": "Detected 3 suspicious off-hours file access events",
    "mitre_technique": "T1078 - Valid Accounts",
    "affected_user": "john.doe@company.com",
    "source_events": ["evt_it_01", "evt_it_02", "evt_it_03"],
    "timestamp": "2026-01-05T03:00:01.234Z",
    "recommendations": [
      "Review user activity",
      "Check data exfiltration",
      "Contact user"
    ]
  }
]
```

**Explanation:**
- **severity:** HIGH (not CRITICAL, but serious)
- **mitre_technique:** T1078 = Insider using valid account
- Off-hours access (2 AM - 5 AM) flagged suspicious

#### Swagger UI Test
1. Go to `POST /correlate`
2. Click "Try it out"
3. Paste Sample Input (Brute Force Pattern)
4. Execute
5. ✅ Verify response is array with 1 incident
6. ✅ Check `title: "Brute Force Attack Detected"`

---

### 4. Get Recent Incidents

**Endpoint:** `GET /incidents`  
**Purpose:** Retrieve recent alerts

#### Query Parameters
- `limit` (optional): Number of incidents to return (default: 10)

#### Sample Request
```http
GET http://localhost:8002/incidents?limit=5
```

#### Sample Response
```json
[
  {
    "alert_id": "INC-00003",
    "severity": "HIGH",
    "title": "Potential Insider Threat",
    "description": "Detected 3 suspicious off-hours file access events",
    "mitre_technique": "T1078 - Valid Accounts",
    "affected_user": "john.doe@company.com",
    "source_events": ["evt_it_01", "evt_it_02", "evt_it_03"],
    "timestamp": "2026-01-05T03:00:01.234Z",
    "recommendations": ["Review user activity", "Check data exfiltration", "Contact user"]
  },
  {
    "alert_id": "INC-00002",
    "severity": "CRITICAL",
    "title": "Brute Force Attack Detected",
    ...
  }
]
```

**Use Case:** Dashboard display of recent security incidents

#### Swagger UI Test
1. `GET /incidents`
2. Try it out
3. Set `limit` to 5
4. Execute
5. ✅ Verify returns array (may be empty if no incidents yet)

---

### 5. Get Detection Rules

**Endpoint:** `GET /rules`  
**Purpose:** List all loaded MITRE ATT&CK rules

#### Sample Request
```http
GET http://localhost:8002/rules
```

#### Sample Response
```json
[
  {
    "rule_id": "T1110",
    "name": "Brute Force Attack",
    "severity": "HIGH",
    "mitre_technique": "T1110",
    "description": "Multiple failed login attempts detected"
  },
  {
    "rule_id": "T1078",
    "name": "Valid Accounts Misuse",
    "severity": "MEDIUM",
    "mitre_technique": "T1078",
    "description": "Unusual access pattern with valid credentials"
  },
  {
    "rule_id": "T1485",
    "name": "Data Destruction",
    "severity": "CRITICAL",
    "mitre_technique": "T1485",
    "description": "Bulk deletion or data destruction detected"
  }
]
```

**Explanation:**
Shows what attack types the system can detect

#### Swagger UI Test
1. `GET /rules`
2. Execute
3. ✅ Verify 3 rules returned
4. ✅ Check MITRE techniques: T1110, T1078, T1485

---

### 6. Get Sample Data: Brute Force

**Endpoint:** `GET /sample-data/brute-force`

#### Sample Response
```json
[
  {
    "event_id": "evt_00010",
    "timestamp": "2026-01-05T03:45:10Z",
    "event_type": "FailedLogin",
    "user_id": "admin@company.com",
    "source_ip": "203.0.113.42",
    "resource": "/api/v1/login",
    "metadata": {"attempt": 10}
  },
  ... (10 failed login events)
]
```

**Use Case:** 
1. Get sample data
2. Use in `/correlate` endpoint
3. Verify brute force detection works

---

### 7. Get Sample Data: Insider Threat

**Endpoint:** `GET /sample-data/insider`

#### Sample Response
```json
[
  {
    "event_id": "evt_insider_10",
    "timestamp": "2026-01-05T03:10:00Z",
    "event_type": "FileAccess",
    "user_id": "john.doe@company.com",
    "source_ip": "10.0.1.50",
    "resource": "/confidential/report_10.pdf",
    "metadata": {"action": "download"}
  },
  ... (5 suspicious file access events)
]
```

**Use Case:** Test insider threat detection

---

## 🧪 Complete Testing Workflow

### Scenario: Detect Brute Force Attack

**Step 1:** Get sample data
```http
GET /sample-data/brute-force
```

**Step 2:** Correlate events
```http
POST /correlate
Body: {
  "events": [paste sample data here],
  "time_window_minutes": 30
}
```

**Step 3:** Verify detection
- ✅ Response should contain 1 incident
- ✅ `mitre_technique: "T1110 - Brute Force"`
- ✅ `severity: "CRITICAL"`

**Step 4:** Check incident log
```http
GET /incidents?limit=1
```
- ✅ Should show the brute force incident

---

## 📊 Understanding MITRE ATT&CK Techniques

| Technique | Name | Trigger | Severity |
|-----------|------|---------|----------|
| **T1110** | Brute Force | ≥5 failed logins | CRITICAL |
| **T1078** | Valid Accounts | ≥3 off-hours file access | HIGH |
| **T1485** | Data Destruction | Bulk delete operations | CRITICAL |

---

## 🔧 Troubleshooting

### Error: "min_length=2" validation error
**Cause:** Correlate endpoint requires at least 2 events  
**Solution:** Submit array with 2+ events

### Empty incidents list
**Cause:** No attacks detected yet  
**Solution:** Submit sample brute force data to generate incident

### Buffer overflow
**Cause:** Buffer limited to 1,000 events  
**Info:** Old events automatically removed (FIFO queue)

---

## 📝 Example curl Commands

### Ingest Event
```bash
curl -X POST http://localhost:8002/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_001",
    "timestamp": "2026-01-05T14:30:00Z",
    "event_type": "FailedLogin",
    "user_id": "test@company.com",
    "source_ip": "1.1.1.1",
    "resource": "/login"
  }'
```

### Get Rules
```bash
curl http://localhost:8002/rules
```

---

## 🎓 Summary

**Total Endpoints:** 7  
**Detection Methods:** MITRE ATT&CK pattern matching  
**Buffer Capacity:** 1,000 events  
**Swagger UI:** http://localhost:8002/docs  

**Main Use Case:** Real-time security incident detection with correlation

---

**Last Updated:** January 5, 2026  
**API Version:** 1.0.0  
**Component:** Incident Detection (IT22033550)
