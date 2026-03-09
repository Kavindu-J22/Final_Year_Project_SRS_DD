"""
Incident Detection & Correlation API
IT22033550 - Component 2

MITRE ATT&CK rule-based threat detection with event correlation
Run: uvicorn api:app --port 8002
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from collections import deque
import yaml, os

app = FastAPI(
    title="Incident Detection & Correlation API",
    description="MITRE ATT&CK threat detection with event correlation",
    version="1.0.0"
)

# Data models
class LogEvent(BaseModel):
    event_id: str = Field(..., example="evt_12345")
    timestamp: str = Field(..., example="2026-01-05T02:00:00Z")
    event_type: str = Field(..., example="FailedLogin")
    user_id: str = Field(..., example="admin@example.com")
    source_ip: str = Field(..., example="192.168.1.100")
    resource: Optional[str] = Field(None, example="/admin/dashboard")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class IncidentAlert(BaseModel):
    alert_id: str
    severity: str
    title: str
    description: str
    mitre_technique: str
    affected_user: str
    source_events: List[str]
    timestamp: str
    recommendations: List[str]

class RuleInfo(BaseModel):
    rule_id: str
    name: str
    severity: str
    mitre_technique: str
    description: str

class CorrelationRequest(BaseModel):
    events: List[LogEvent] = Field(..., min_length=2)
    time_window_minutes: int = Field(30, ge=1, le=120)

class HealthResponse(BaseModel):
    status: str
    rules_loaded: int
    buffer_size: int
    api_version: str

# State management
EVENT_BUFFER: deque = deque(maxlen=1000)
INCIDENT_COUNTER = 0
RULES_CACHE: List[Dict] = []
RECENT_INCIDENTS: List[IncidentAlert] = []

# Rule loading
def load_rules():
    global RULES_CACHE
    rules_path = os.path.join(os.path.dirname(__file__), "rulebase.yaml")
    if not os.path.exists(rules_path):
        RULES_CACHE = get_default_rules()
        return
    try:
        with open(rules_path, 'r') as f:
            data = yaml.safe_load(f)
            RULES_CACHE = []
            for key in data:
                if key.endswith('_rules') and isinstance(data[key], list):
                    RULES_CACHE.extend(data[key])
    except Exception as e:
        print(f"Error: {e}")
        RULES_CACHE = get_default_rules()

def get_default_rules():
    return [
        {"rule_id": "T1110", "name": "Brute Force Attack", "severity": "HIGH",
         "mitre_technique": "T1110", "description": "Multiple failed login attempts detected",
         "threshold": 5, "time_window": 60},
        {"rule_id": "T1078", "name": "Valid Accounts Misuse", "severity": "MEDIUM",
         "mitre_technique": "T1078", "description": "Unusual access pattern with valid credentials",
         "threshold": 1, "time_window": 300},
        {"rule_id": "T1485", "name": "Data Destruction", "severity": "CRITICAL",
         "mitre_technique": "T1485", "description": "Bulk deletion or data destruction detected",
         "threshold": 1, "time_window": 60}
    ]

# Pattern detection
def check_brute_force(events: List[LogEvent]) -> Optional[IncidentAlert]:
    failed_logins = [e for e in events if e.event_type == "FailedLogin"]
    if len(failed_logins) >= 5:
        global INCIDENT_COUNTER
        INCIDENT_COUNTER += 1
        return IncidentAlert(
            alert_id=f"INC-{INCIDENT_COUNTER:05d}", severity="CRITICAL",
            title="Brute Force Attack Detected",
            description=f"Detected {len(failed_logins)} failed login attempts",
            mitre_technique="T1110 - Brute Force", affected_user=failed_logins[0].user_id,
            source_events=[e.event_id for e in failed_logins],
            timestamp=datetime.utcnow().isoformat(),
            recommendations=["Lock affected account", "Investigate source IP", "Enable MFA"]
        )
    return None

def check_insider_threat(events: List[LogEvent]) -> Optional[IncidentAlert]:
    suspicious = []
    for event in events:
        try:
            hour = int(event.timestamp.split("T")[1].split(":")[0])
            if (hour >= 22 or hour <= 5) and event.event_type in ["FileAccess", "Download"]:
                suspicious.append(event)
        except:
            pass
    if len(suspicious) >= 3:
        global INCIDENT_COUNTER
        INCIDENT_COUNTER += 1
        return IncidentAlert(
            alert_id=f"INC-{INCIDENT_COUNTER:05d}", severity="HIGH",
            title="Potential Insider Threat",
            description=f"Detected {len(suspicious)} suspicious off-hours file access events",
            mitre_technique="T1078 - Valid Accounts", affected_user=suspicious[0].user_id,
            source_events=[e.event_id for e in suspicious],
            timestamp=datetime.utcnow().isoformat(),
            recommendations=["Review user activity", "Check data exfiltration", "Contact user"]
        )
    return None

load_rules()

# API endpoints
@app.get("/", response_model=HealthResponse)
async def root():
    return {"status": "healthy", "rules_loaded": len(RULES_CACHE),
            "buffer_size": len(EVENT_BUFFER), "api_version": "1.0.0"}

@app.post("/ingest", response_model=Dict[str, Any])
async def ingest_event(event: LogEvent):
    EVENT_BUFFER.append(event)
    alerts = []
    if event.event_type == "FailedLogin":
        recent_fails = [e for e in EVENT_BUFFER 
                       if e.user_id == event.user_id and e.event_type == "FailedLogin"]
        if len(recent_fails) >= 5:
            alert = check_brute_force(recent_fails)
            if alert:
                alerts.append(alert)
                RECENT_INCIDENTS.append(alert)
    return {"status": "ingested", "event_id": event.event_id,
            "buffer_size": len(EVENT_BUFFER), "alerts_triggered": len(alerts),
            "alerts": [alert.dict() for alert in alerts]}

@app.post("/correlate", response_model=List[IncidentAlert])
async def correlate_events(request: CorrelationRequest):
    incidents = []
    brute_force_alert = check_brute_force(request.events)
    if brute_force_alert:
        incidents.append(brute_force_alert)
        RECENT_INCIDENTS.append(brute_force_alert)
    insider_alert = check_insider_threat(request.events)
    if insider_alert:
        incidents.append(insider_alert)
        RECENT_INCIDENTS.append(insider_alert)
    return incidents

@app.get("/incidents", response_model=List[IncidentAlert])
async def get_incidents(limit: int = 10):
    return RECENT_INCIDENTS[-limit:]

@app.get("/rules", response_model=List[RuleInfo])
async def get_rules():
    return [RuleInfo(
        rule_id=rule.get("rule_id", "N/A"), name=rule.get("name", "Unknown"),
        severity=rule.get("severity", "MEDIUM"), mitre_technique=rule.get("mitre_technique", "N/A"),
        description=rule.get("description", "No description")
    ) for rule in RULES_CACHE]

@app.get("/sample-data/brute-force", response_model=List[LogEvent])
async def get_brute_force_sample():
    return [LogEvent(event_id=f"evt_{i:05d}", timestamp=f"2026-01-05T03:45:{i:02d}Z",
                     event_type="FailedLogin", user_id="admin@company.com",
                     source_ip="203.0.113.42", resource="/api/v1/login",
                     metadata={"attempt": i}) for i in range(10, 20)]

@app.get("/sample-data/insider", response_model=List[LogEvent])
async def get_insider_sample():
    return [LogEvent(event_id=f"evt_insider_{i}", timestamp=f"2026-01-05T03:{i:02d}:00Z",
                     event_type="FileAccess", user_id="john.doe@company.com",
                     source_ip="10.0.1.50", resource=f"/confidential/report_{i}.pdf",
                     metadata={"action": "download"}) for i in range(10, 15)]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
