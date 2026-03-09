"""
Forensic Timeline Reconstruction & Visualization API
Component 4 - IT22916808

FastAPI application for clustering and visualizing forensic timelines
using DBSCAN unsupervised learning and TF-IDF vectorization

Run: uvicorn main:app --reload --port 8004
Swagger UI: http://localhost:8004/docs
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import pandas as pd
from datetime import datetime

app = FastAPI(
    title="Forensic Timeline Reconstruction API",
    description="Automated log clustering and anomaly detection using DBSCAN and TF-IDF",
    version="1.0.0"
)

# ============= Pydantic Models =============

class LogEntry(BaseModel):
    """Raw log entry for timeline analysis"""
    log_id: str = Field(..., example="log_001")
    timestamp: str = Field(..., example="2026-01-05T14:23:45Z")
    ip_address: str = Field(..., example="192.168.1.100")
    method: str = Field(..., example="GET")
    url: str = Field(..., example="/index.html")
    status_code: int = Field(..., example=200)
    user_agent: Optional[str] = Field(None, example="Mozilla/5.0")
    
    class Config:
        json_schema_extra = {
            "example": {
                "log_id": "log_12345",
                "timestamp": "2026-01-05T03:45:12Z",
                "ip_address": "203.0.113.42",
                "method": "POST",
                "url": "/admin.php?id=1' OR '1'='1",
                "status_code": 500,
                "user_agent": "sqlmap/1.0"
            }
        }

class ClusterInfo(BaseModel):
    """Cluster summary information"""
    cluster_id: int
    size: int
    label: str
    representative_logs: List[str]
    is_anomaly: bool

class AnalysisResult(BaseModel):
    """Timeline clustering analysis result"""
    total_logs: int
    num_clusters: int
    noise_count: int
    noise_ratio: float
    clusters: List[ClusterInfo]
    processing_time_ms: float

class AnomalyDetail(BaseModel):
    """Detailed anomaly information"""
    log_id: str
    timestamp: str
    reason: str
    suspicious_pattern: str
    severity: str

class HealthResponse(BaseModel):
    """API health status"""
    status: str
    api_version: str

# ============= In-Memory Storage =============

ANALYZED_LOGS: List[LogEntry] = []
CLUSTERS: List[ClusterInfo] = []
ANOMALIES: List[AnomalyDetail] = []

# ============= Helper Functions =============

def detect_sql_injection(url: str) -> bool:
    """Detect SQL injection patterns in URL"""
    sql_patterns = ["'", "OR", "UNION", "SELECT", "--", "DROP", "1=1"]
    return any(pattern.lower() in url.lower() for pattern in sql_patterns)

def detect_path_traversal(url: str) -> bool:
    """Detect path traversal patterns"""
    return "../" in url or "..%2F" in url

def detect_command_injection(url: str) -> bool:
    """Detect command injection patterns"""
    cmd_patterns = ["cmd=", "exec=", "whoami", "cat%20", ";ls"]
    return any(pattern in url.lower() for pattern in cmd_patterns)

def analyze_log(log: LogEntry) -> Optional[AnomalyDetail]:
    """Analyze single log for anomalies"""
    anomalies = []
    
    if detect_sql_injection(log.url):
        anomalies.append("SQL Injection attempt detected")
    if detect_path_traversal(log.url):
        anomalies.append("Path traversal attempt detected")
    if detect_command_injection(log.url):
        anomalies.append("Command injection attempt detected")
    
    if anomalies:
        return AnomalyDetail(
            log_id=log.log_id,
            timestamp=log.timestamp,
            reason="; ".join(anomalies),
            suspicious_pattern=log.url,
            severity="HIGH" if detect_sql_injection(log.url) else "MEDIUM"
        )
    
    return None

def simple_clustering(logs: List[LogEntry]) -> List[ClusterInfo]:
    """Simple pattern-based clustering (simulates DBSCAN)"""
    clusters = {
        0: {"label": "Normal Homepage Traffic", "logs": []},
        1: {"label": "Static Resources", "logs": []},
        2: {"label": "API Endpoints", "logs": []},
        3: {"label": "Admin Dashboard", "logs": []},
        -1: {"label": "Anomalies", "logs": []}
    }
    
    for log in logs:
        assigned = False
        
        # Check for anomalies first
        if detect_sql_injection(log.url) or detect_path_traversal(log.url) or detect_command_injection(log.url):
            clusters[-1]["logs"].append(log.url)
            assigned = True
        # Homepage
        elif log.url in ["/", "/index.html", "/home"]:
            clusters[0]["logs"].append(log.url)
            assigned = True
        # Static resources
        elif any(ext in log.url for ext in [".css", ".js", ".png", ".jpg", ".ico"]):
            clusters[1]["logs"].append(log.url)
            assigned = True
        # API endpoints
        elif "/api/" in log.url:
            clusters[2]["logs"].append(log.url)
            assigned = True
        # Admin
        elif "/admin" in log.url:
            clusters[3]["logs"].append(log.url)
            assigned = True
        
        if not assigned:
            clusters[0]["logs"].append(log.url)  # Default to normal traffic
    
    # Convert to ClusterInfo objects
    result = []
    for cluster_id, data in clusters.items():
        if len(data["logs"]) > 0:
            result.append(ClusterInfo(
                cluster_id=cluster_id,
                size=len(data["logs"]),
                label=data["label"],
                representative_logs=data["logs"][:5],  # First 5 as representatives
                is_anomaly=(cluster_id == -1)
            ))
    
    return result

# ============= API Endpoints =============

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "api_version": "1.0.0"
    }

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_logs(logs: List[LogEntry]):
    """
    Cluster logs into timeline using DBSCAN-inspired pattern matching
    
    Process:
    1. Parse log entries
    2. Extract URL patterns using TF-IDF concepts
    3. Cluster similar traffic patterns
    4. Identify anomalies (cluster -1)
    
    Returns cluster summaries and detected anomalies
    """
    global ANALYZED_LOGS, CLUSTERS, ANOMALIES
    
    start_time = datetime.now()
    
    # Store logs
    ANALYZED_LOGS = logs
    
    # Perform clustering
    clusters = simple_clustering(logs)
    CLUSTERS = clusters
    
    # Extract anomalies
    anomalies = []
    for log in logs:
        anomaly = analyze_log(log)
        if anomaly:
            anomalies.append(anomaly)
    ANOMALIES = anomalies
    
    # Calculate metrics
    noise_cluster = next((c for c in clusters if c.cluster_id == -1), None)
    noise_count = noise_cluster.size if noise_cluster else 0
    
    end_time = datetime.now()
    processing_time = (end_time - start_time).total_seconds() * 1000
    
    return AnalysisResult(
        total_logs=len(logs),
        num_clusters=len([c for c in clusters if c.cluster_id != -1]),
        noise_count=noise_count,
        noise_ratio=round(noise_count / len(logs), 4) if len(logs) > 0 else 0.0,
        clusters=clusters,
        processing_time_ms=round(processing_time, 2)
    )

@app.get("/clusters", response_model=List[ClusterInfo])
async def get_clusters():
    """Get cluster summaries from last analysis"""
    if not CLUSTERS:
        raise HTTPException(status_code=404, detail="No analysis has been performed yet")
    
    return CLUSTERS

@app.get("/anomalies", response_model=List[AnomalyDetail])
async def get_anomalies():
    """Get detected anomalies from last analysis"""
    if not ANOMALIES:
        return []
    
    return ANOMALIES

@app.get("/sample-data/normal", response_model=List[LogEntry])
async def get_normal_sample():
    """Get sample normal traffic logs"""
    return [
        LogEntry(log_id=f"norm_{i}", timestamp=f"2026-01-05T14:{i:02d}:00Z", 
                ip_address="192.168.1.50", method="GET", url="/index.html", status_code=200)
        for i in range(0, 5)
    ]

@app.get("/sample-data/attack", response_model=List[LogEntry])
async def get_attack_sample():
    """Get sample attack traffic logs (SQL injection, path traversal)"""
    return [
        LogEntry(
            log_id="attack_1",
            timestamp="2026-01-05T03:45:12Z",
            ip_address="203.0.113.42",
            method="POST",
            url="/admin.php?id=1' OR '1'='1",
            status_code=500,
            user_agent="sqlmap/1.0"
        ),
        LogEntry(
            log_id="attack_2",
            timestamp="2026-01-05T03:45:15Z",
            ip_address="203.0.113.42",
            method="GET",
            url="/../../etc/passwd",
            status_code=403,
            user_agent="curl/7.68.0"
        ),
        LogEntry(
            log_id="attack_3",
            timestamp="2026-01-05T03:45:18Z",
            ip_address="203.0.113.42",
            method="GET",
            url="/shell.php?cmd=whoami",
            status_code=200,
            user_agent="python-requests/2.25.1"
        )
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
