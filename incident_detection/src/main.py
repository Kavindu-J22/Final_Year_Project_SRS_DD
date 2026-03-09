"""
Incident Detection Engine - Main Entry Point
=============================================
This is the main orchestrator that ties together:
- Log Normalization (AWS/Azure/GCP  Unified Schema)
- Rule-Based Detection (Single-event threats)
- Correlation Engine (Multi-step attack patterns)
- Alert Manager (Storage & Notifications)

Author: W. L. C. A. Fernando (IT22033550)
Component: 2 - Incident Detection & Correlation Engine
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from src.normalizer import LogNormalizer, normalize_log
from src.detector import RuleEngine, Alert
from src.correlator import Correlator, CorrelationAlert, StateManager
from src.alerter import AlertManager

# incident detection engine
class IncidentDetectionEngine:
    """
    The main engine that processes logs through the detection pipeline.
    
    Pipeline:
    1. Normalize raw logs  Unified schema
    2. Evaluate against rules  Single-event alerts
    3. Correlate across time  Multi-step attack alerts
    4. Store alerts and create incidents
    """
    
    def __init__(self, rulebase_path: str = None):
        """
        Initialize the detection engine.
        
        Args:
            rulebase_path: Path to the rulebase.yaml file
        """
        if rulebase_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            rulebase_path = os.path.join(script_dir, "..", "rulebase.yaml")
        
        print("=" * 60)
        print("  INCIDENT DETECTION ENGINE")
        print("  Component 2 - Security Monitoring System")
        print("=" * 60)
        
        print("\n[1/4] Initializing Log Normalizer...")
        self.normalizer = LogNormalizer()
        
        print("[2/4] Loading Detection Rules...")
        self.rule_engine = RuleEngine(rulebase_path)
        rules_summary = self.rule_engine.get_rules_summary()
        print(f"      Loaded {rules_summary['total_rules']} rules")
        
        print("[3/4] Initializing Correlation Engine...")
        self.correlator = Correlator()
        
        print("[4/4] Initializing Alert Manager...")
        self.alert_manager = AlertManager()
        
        self.stats = {
            "logs_processed": 0,
            "alerts_generated": 0,
            "correlation_alerts": 0,
            "start_time": datetime.utcnow().isoformat()
        }
        
        print("\n Engine initialized successfully!")
        print("-" * 60)
    
    def process_log(self, raw_log: Dict, provider: str = None) -> Dict:
        """
        Process a single log through the full pipeline.
        
        Args:
            raw_log: Raw log from cloud provider
            provider: Optional provider hint ('aws', 'azure', 'gcp')
        
        Returns:
            Dictionary with processing results
        """
        result = {
            "normalized_log": None,
            "rule_alerts": [],
            "correlation_alerts": [],
            "errors": []
        }
        
        try:
            normalized = self.normalizer.normalize(raw_log, provider)
            result["normalized_log"] = normalized.to_dict()
            
            log_id = self.alert_manager.store_log(result["normalized_log"])
            result["normalized_log"]["_id"] = log_id
            
            rule_alerts = self.rule_engine.evaluate(result["normalized_log"])
            for alert in rule_alerts:
                alert_dict = alert.to_dict()
                alert_dict["log_id"] = log_id
                self.alert_manager.store_alert(alert_dict)
                result["rule_alerts"].append(alert_dict)
            
            corr_alerts = self.correlator.process_event(result["normalized_log"])
            for alert in corr_alerts:
                alert_dict = alert.to_dict()
                self.alert_manager.store_alert(alert_dict)
                result["correlation_alerts"].append(alert_dict)
            
            self.stats["logs_processed"] += 1
            self.stats["alerts_generated"] += len(rule_alerts)
            self.stats["correlation_alerts"] += len(corr_alerts)
            
        except Exception as e:
            result["errors"].append(str(e))
        
        return result
    
    def process_batch(self, logs: List[Dict], provider: str = None) -> List[Dict]:
        """
        Process a batch of logs.
        """
        results = []
        for log in logs:
            result = self.process_log(log, provider)
            results.append(result)
        return results
    
    def get_statistics(self) -> Dict:
        """
        Get engine and alert statistics.
        """
        engine_stats = self.stats.copy()
        engine_stats["alert_stats"] = self.alert_manager.get_statistics()
        return engine_stats
    
    def get_recent_alerts(self, limit: int = 50) -> List[Dict]:
        """
        Get recent alerts.
        """
        return self.alert_manager.get_recent_alerts(limit)
    
    def get_open_incidents(self) -> List[Dict]:
        """
        Get all open incidents.
        """
        return self.alert_manager.get_open_incidents()

# main
def main():
    """
    Main function - demonstrates the engine functionality.
    """
    print("\n" + "=" * 60)
    print("  STARTING INCIDENT DETECTION ENGINE")
    print("=" * 60 + "\n")
    
    engine = IncidentDetectionEngine()
    
    sample_log = {
        "eventTime": "2024-01-15T10:30:00Z",
        "eventSource": "iam.amazonaws.com",
        "eventName": "CreateAccessKey",
        "userIdentity": {
            "type": "IAMUser",
            "userName": "suspicious-user",
            "arn": "arn:aws:iam::123456789:user/suspicious-user"
        },
        "sourceIPAddress": "203.0.113.50",
        "awsRegion": "us-east-1"
    }
    
    print("\n Processing sample AWS CloudTrail log...")
    result = engine.process_log(sample_log, provider="aws")
    
    print(f"\n Results:")
    print(f"   - Log normalized: ")
    print(f"   - Rule alerts: {len(result['rule_alerts'])}")
    print(f"   - Correlation alerts: {len(result['correlation_alerts'])}")
    
    if result['rule_alerts']:
        print("\n Alerts generated:")
        for alert in result['rule_alerts']:
            print(f"   [{alert['severity']}] {alert['rule_name']}")
    
    print("\n Engine Statistics:")
    stats = engine.get_statistics()
    print(json.dumps(stats, indent=2))
    
    print("\n Engine demonstration complete!")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
