"""
Alert Manager Module
====================
This module handles alert generation, storage, and notification.
Stores incidents in MongoDB and can send real-time notifications.
"""

import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from dotenv import load_dotenv
import json

load_dotenv()

try:
    from pymongo import MongoClient, DESCENDING
    MONGO_AVAILABLE = True
except ImportError:
    MONGO_AVAILABLE = False

@dataclass
# incident
class Incident:
    """
    Represents a security incident composed of one or more related alerts.
    """
    incident_id: str
    severity: str
    status: str
    title: str
    description: str
    alerts: List[Dict]
    affected_resources: List[str]
    actor_id: str
    source_ip: str
    cloud_provider: str
    first_seen: str
    last_seen: str
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict:
        return {
            "incident_id": self.incident_id,
            "severity": self.severity,
            "status": self.status,
            "title": self.title,
            "description": self.description,
            "alerts": self.alerts,
            "affected_resources": self.affected_resources,
            "actor_id": self.actor_id,
            "source_ip": self.source_ip,
            "cloud_provider": self.cloud_provider,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "created_at": self.created_at
        }

# alert manager
class AlertManager:
    """
    Manages alerts and incidents, stores them in MongoDB,
    and handles notifications.
    """
    
    SEVERITY_RANK = {
        "INFO": 0,
        "LOW": 1,
        "MEDIUM": 2,
        "HIGH": 3,
        "CRITICAL": 4
    }
    
    def __init__(self, mongo_uri: str = None, db_name: str = None):
        self.mongo_uri = mongo_uri or os.getenv("MONGO_URI", "mongodb://localhost:27017/")
        self.db_name = db_name or os.getenv("MONGO_DB_NAME", "incident_detection")
        self.webhook_url = os.getenv("ALERT_WEBHOOK_URL", "")
        
        self.client = None
        self.db = None
        self.alerts_collection = None
        self.incidents_collection = None
        self.logs_collection = None
        self.use_memory = not MONGO_AVAILABLE
        
        self.memory_alerts: List[Dict] = []
        self.memory_incidents: List[Dict] = []
        self.memory_logs: List[Dict] = []
        
        if not self.use_memory:
            self._connect()
    
    def _connect(self):
        """Connect to MongoDB."""
        try:
            self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            self.alerts_collection = self.db["alerts"]
            self.incidents_collection = self.db["incidents"]
            self.logs_collection = self.db["logs"]
            
            self.alerts_collection.create_index([("timestamp", DESCENDING)])
            self.alerts_collection.create_index("severity")
            self.incidents_collection.create_index([("created_at", DESCENDING)])
            self.incidents_collection.create_index("status")
            
            print(f"AlertManager connected to MongoDB: {self.db_name}")
        except Exception as e:
            print(f"MongoDB connection failed: {e}. Using in-memory storage.")
            self.use_memory = True
    
    def store_log(self, normalized_log: Dict) -> str:
        """
        Store a normalized log and return its ID.
        """
        log_entry = normalized_log.copy()
        log_entry["stored_at"] = datetime.utcnow().isoformat()
        
        if self.use_memory:
            log_id = f"log_{len(self.memory_logs)}"
            log_entry["_id"] = log_id
            self.memory_logs.append(log_entry)
            return log_id
        
        result = self.logs_collection.insert_one(log_entry)
        return str(result.inserted_id)
    
    def store_alert(self, alert: Dict) -> str:
        """
        Store an alert in the database.
        """
        alert_entry = alert.copy()
        alert_entry["stored_at"] = datetime.utcnow().isoformat()
        
        if self.use_memory:
            alert_id = f"alert_{len(self.memory_alerts)}"
            alert_entry["_id"] = alert_id
            self.memory_alerts.append(alert_entry)
            self._notify(alert_entry)
            return alert_id
        
        result = self.alerts_collection.insert_one(alert_entry)
        self._notify(alert_entry)
        return str(result.inserted_id)
    
    def create_incident(self, alerts: List[Dict], title: str = None) -> Incident:
        """
        Create an incident from one or more related alerts.
        """
        if not alerts:
            raise ValueError("Cannot create incident without alerts")
        
        max_severity = "INFO"
        for alert in alerts:
            alert_sev = alert.get("severity", "INFO")
            if self.SEVERITY_RANK.get(alert_sev, 0) > self.SEVERITY_RANK.get(max_severity, 0):
                max_severity = alert_sev
        
        first_alert = alerts[0]
        timestamps = [a.get("timestamp", "") for a in alerts]
        
        incident = Incident(
            incident_id=f"INC-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            severity=max_severity,
            status="open",
            title=title or first_alert.get("rule_name", "Security Incident"),
            description=first_alert.get("description", ""),
            alerts=[a for a in alerts],
            affected_resources=[a.get("resource_id", "") for a in alerts if a.get("resource_id")],
            actor_id=first_alert.get("actor_id", ""),
            source_ip=first_alert.get("source_ip", ""),
            cloud_provider=first_alert.get("cloud_provider", ""),
            first_seen=min(timestamps) if timestamps else "",
            last_seen=max(timestamps) if timestamps else ""
        )
        
        incident_dict = incident.to_dict()
        
        if self.use_memory:
            self.memory_incidents.append(incident_dict)
        else:
            self.incidents_collection.insert_one(incident_dict)
        
        print(f" Incident created: {incident.incident_id} [{incident.severity}] {incident.title}")
        return incident
    
    def get_recent_alerts(self, limit: int = 100, severity: str = None) -> List[Dict]:
        """
        Get recent alerts, optionally filtered by severity.
        """
        if self.use_memory:
            alerts = self.memory_alerts[-limit:]
            if severity:
                alerts = [a for a in alerts if a.get("severity") == severity]
            return alerts
        
        query = {}
        if severity:
            query["severity"] = severity
        
        cursor = self.alerts_collection.find(query).sort("timestamp", DESCENDING).limit(limit)
        return list(cursor)
    
    def get_open_incidents(self) -> List[Dict]:
        """
        Get all open incidents.
        """
        if self.use_memory:
            return [i for i in self.memory_incidents if i.get("status") == "open"]
        
        return list(self.incidents_collection.find({"status": "open"}))
    
    def update_incident_status(self, incident_id: str, status: str) -> bool:
        """
        Update an incident's status.
        """
        if self.use_memory:
            for inc in self.memory_incidents:
                if inc.get("incident_id") == incident_id:
                    inc["status"] = status
                    return True
            return False
        
        result = self.incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"status": status, "updated_at": datetime.utcnow().isoformat()}}
        )
        return result.modified_count > 0
    
    def get_statistics(self) -> Dict:
        """
        Get alert and incident statistics.
        """
        if self.use_memory:
            return {
                "total_logs": len(self.memory_logs),
                "total_alerts": len(self.memory_alerts),
                "total_incidents": len(self.memory_incidents),
                "open_incidents": len([i for i in self.memory_incidents if i.get("status") == "open"]),
                "alerts_by_severity": self._count_by_severity(self.memory_alerts)
            }
        
        return {
            "total_logs": self.logs_collection.count_documents({}),
            "total_alerts": self.alerts_collection.count_documents({}),
            "total_incidents": self.incidents_collection.count_documents({}),
            "open_incidents": self.incidents_collection.count_documents({"status": "open"}),
            "alerts_by_severity": {
                "CRITICAL": self.alerts_collection.count_documents({"severity": "CRITICAL"}),
                "HIGH": self.alerts_collection.count_documents({"severity": "HIGH"}),
                "MEDIUM": self.alerts_collection.count_documents({"severity": "MEDIUM"}),
                "LOW": self.alerts_collection.count_documents({"severity": "LOW"})
            }
        }
    
    def _count_by_severity(self, alerts: List[Dict]) -> Dict:
        """Count alerts by severity level."""
        counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        for alert in alerts:
            sev = alert.get("severity", "INFO")
            counts[sev] = counts.get(sev, 0) + 1
        return counts
    
    def _notify(self, alert: Dict) -> None:
        """
        Send a notification for high-severity alerts.
        """
        severity = alert.get("severity", "INFO")
        
        if severity not in ["HIGH", "CRITICAL"]:
            return
        
        emoji = "" if severity == "CRITICAL" else ""
        print(f"\n{emoji} ALERT [{severity}]: {alert.get('rule_name', 'Unknown')}")
        print(f"   Actor: {alert.get('actor_id', 'N/A')}")
        print(f"   Source IP: {alert.get('source_ip', 'N/A')}")
        print(f"   Event: {alert.get('event_name', 'N/A')}")
        
        if self.webhook_url:
            self._send_webhook(alert)
    
    def _send_webhook(self, alert: Dict) -> None:
        """
        Send alert to configured webhook (Slack, Discord, etc.)
        """
        try:
            import requests
            
            payload = {
                "text": f" Security Alert: [{alert.get('severity')}] {alert.get('rule_name')}",
                "attachments": [{
                    "color": "danger" if alert.get("severity") == "CRITICAL" else "warning",
                    "fields": [
                        {"title": "Actor", "value": alert.get("actor_id", "N/A"), "short": True},
                        {"title": "Source IP", "value": alert.get("source_ip", "N/A"), "short": True},
                        {"title": "Event", "value": alert.get("event_name", "N/A"), "short": True},
                        {"title": "Cloud", "value": alert.get("cloud_provider", "N/A"), "short": True}
                    ]
                }]
            }
            
            requests.post(self.webhook_url, json=payload, timeout=5)
        except Exception as e:
            print(f"Webhook notification failed: {e}")

if __name__ == "__main__":
    print("Testing Alert Manager...")
    
    manager = AlertManager()
    
    test_alert = {
        "rule_id": "AUTH_BRUTE_FORCE",
        "rule_name": "Brute Force Attack Detected",
        "severity": "HIGH",
        "category": "authentication",
        "description": "5 failed login attempts detected",
        "timestamp": datetime.utcnow().isoformat(),
        "actor_id": "attacker@evil.com",
        "source_ip": "192.168.1.100",
        "cloud_provider": "aws"
    }
    
    alert_id = manager.store_alert(test_alert)
    print(f"\nStored alert with ID: {alert_id}")
    
    incident = manager.create_incident([test_alert])
    print(f"\nCreated incident: {incident.incident_id}")
    
    stats = manager.get_statistics()
    print(f"\nStatistics:")
    print(json.dumps(stats, indent=2))
