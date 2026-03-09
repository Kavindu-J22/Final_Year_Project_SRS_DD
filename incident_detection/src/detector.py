"""
Detection Engine Module
=======================
This module loads rules from rulebase.yaml and evaluates normalized logs
against those rules to detect security threats.

Components:
- RuleLoader: Parses and loads rules from YAML
- RuleEngine: Matches logs against rules and generates alerts
"""

import yaml
import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import os

@dataclass
# rule
class Rule:
    """Represents a detection rule loaded from the rulebase."""
    id: str
    name: str
    description: str
    severity: str
    category: str
    event_types: List[str] = field(default_factory=list)
    condition: Dict = field(default_factory=dict)
    correlation: Dict = field(default_factory=dict)
    
    def __repr__(self):
        return f"Rule({self.id}: {self.name})"

@dataclass
# alert
class Alert:
    """Represents an alert generated when a rule matches."""
    rule_id: str
    rule_name: str
    severity: str
    category: str
    description: str
    timestamp: str
    log_id: Optional[str] = None
    actor_id: str = ""
    source_ip: str = ""
    cloud_provider: str = ""
    event_name: str = ""
    matched_conditions: Dict = field(default_factory=dict)
    
    # to dict
    def to_dict(self) -> Dict:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "severity": self.severity,
            "category": self.category,
            "description": self.description,
            "timestamp": self.timestamp,
            "alert_generated_at": datetime.utcnow().isoformat(),
            "log_id": self.log_id,
            "actor_id": self.actor_id,
            "source_ip": self.source_ip,
            "cloud_provider": self.cloud_provider,
            "event_name": self.event_name,
            "matched_conditions": self.matched_conditions
        }

from config import Config

# rule loader
class RuleLoader:
    """
    Loads and parses detection rules from a YAML file.
    Supports hot-reloading of rules without restarting the engine.
    """
    
    def __init__(self, rulebase_path: str = None):
        self.rulebase_path = rulebase_path or Config.RULEBASE_PATH
        self.rules: List[Rule] = []
        self.attack_patterns: List[Dict] = []
        self._last_modified: float = 0
        self.load_rules()
    
    # load rules
    def load_rules(self) -> None:
        """Load all rules from the YAML file."""
        if not os.path.exists(self.rulebase_path):
            raise FileNotFoundError(f"Rulebase not found: {self.rulebase_path}")
        
        with open(self.rulebase_path, 'r') as f:
            config = yaml.safe_load(f)
        
        self.rules = []
        self.attack_patterns = []
        
        for rule_data in config.get("authentication_rules", []):
            self.rules.append(self._parse_rule(rule_data))
        
        for rule_data in config.get("privilege_rules", []):
            self.rules.append(self._parse_rule(rule_data))
        
        for rule_data in config.get("network_rules", []):
            self.rules.append(self._parse_rule(rule_data))
        
        for rule_data in config.get("data_rules", []):
            self.rules.append(self._parse_rule(rule_data))
        
        for rule_data in config.get("resource_rules", []):
            self.rules.append(self._parse_rule(rule_data))
        
        self.attack_patterns = config.get("attack_patterns", [])
        
        self._last_modified = os.path.getmtime(self.rulebase_path)
        print(f"Loaded {len(self.rules)} rules and {len(self.attack_patterns)} attack patterns")
    
    # parse rule
    def _parse_rule(self, rule_data: Dict) -> Rule:
        """Parse a rule dictionary into a Rule object."""
        return Rule(
            id=rule_data.get("id", "UNKNOWN"),
            name=rule_data.get("name", "Unknown Rule"),
            description=rule_data.get("description", ""),
            severity=rule_data.get("severity", "LOW"),
            category=rule_data.get("category", "unknown"),
            event_types=rule_data.get("event_types", []),
            condition=rule_data.get("condition", {}),
            correlation=rule_data.get("correlation", {})
        )
    
    # check for updates
    def check_for_updates(self) -> bool:
        """Check if the rulebase file has been modified and reload if needed."""
        current_mtime = os.path.getmtime(self.rulebase_path)
        if current_mtime > self._last_modified:
            print("Rulebase updated, reloading rules...")
            self.load_rules()
            return True
        return False
    
    # get rules by category
    def get_rules_by_category(self, category: str) -> List[Rule]:
        """Get all rules matching a specific category."""
        return [r for r in self.rules if r.category == category]
    
    # get rule by id
    def get_rule_by_id(self, rule_id: str) -> Optional[Rule]:
        """Get a specific rule by its ID."""
        for rule in self.rules:
            if rule.id == rule_id:
                return rule
        return None

# rule engine
class RuleEngine:
    """
    The main detection engine that evaluates logs against rules.
    """
    
    def __init__(self, rulebase_path: str = "rulebase.yaml"):
        self.rule_loader = RuleLoader(rulebase_path)
    
    # evaluate
    def evaluate(self, normalized_log: Dict) -> List[Alert]:
        """
        Evaluate a normalized log against all loaded rules.
        
        Args:
            normalized_log: A log that has been normalized by the LogNormalizer
        
        Returns:
            List of Alert objects for each rule that matched
        """
        alerts = []
        
        for rule in self.rule_loader.rules:
            if self._matches_rule(normalized_log, rule):
                alert = self._create_alert(normalized_log, rule)
                alerts.append(alert)
        
        return alerts
    
    # matches rule
    def _matches_rule(self, log: Dict, rule: Rule) -> bool:
        """
        Check if a log matches a rule's conditions.
        """
        if rule.correlation:
            return False
        
        if rule.event_types:
            log_event = log.get("event_name", "")
            if not any(self._event_matches(log_event, evt) for evt in rule.event_types):
                return False
        
        if rule.condition:
            if not self._check_condition(log, rule.condition):
                return False
        
        return True
    
    # event matches
    def _event_matches(self, log_event: str, rule_event: str) -> bool:
        """
        Check if a log event matches a rule event pattern.
        Supports exact match and partial match.
        """
        if not log_event or not rule_event:
            return False
        
        if log_event == rule_event:
            return True
        
        if rule_event.lower() in log_event.lower():
            return True
        
        return False
    
    # check condition
    def _check_condition(self, log: Dict, condition: Dict) -> bool:
        """
        Check if a log meets all conditions in the rule.
        """
        for key, expected_value in condition.items():
            
            if key == "status":
                if log.get("status", "") != expected_value:
                    return False
            
            elif key == "actor_type":
                actor = log.get("actor_type", "")
                if isinstance(expected_value, list):
                    if actor not in expected_value and log.get("actor_id", "") not in expected_value:
                        return False
                else:
                    if actor != expected_value:
                        return False
            
            elif key == "contains":
                raw_log_str = str(log.get("raw_log", {}))
                found = False
                for pattern in expected_value:
                    if pattern in raw_log_str:
                        found = True
                        break
                if not found:
                    return False
            
            elif key == "port":
                raw_log_str = str(log.get("raw_log", {}))
                port_str = str(expected_value)
                if port_str not in raw_log_str:
                    return False
            
            elif key == "source":
                raw_log_str = str(log.get("raw_log", {}))
                if expected_value not in raw_log_str:
                    return False
            
            elif key == "bytes_transferred_gt":
                pass
        
        return True
    
    # create alert
    def _create_alert(self, log: Dict, rule: Rule) -> Alert:
        """
        Create an alert from a matched rule.
        """
        return Alert(
            rule_id=rule.id,
            rule_name=rule.name,
            severity=rule.severity,
            category=rule.category,
            description=rule.description,
            timestamp=log.get("timestamp", datetime.utcnow().isoformat()),
            log_id=str(log.get("_id", "")),
            actor_id=log.get("actor_id", ""),
            source_ip=log.get("source_ip", ""),
            cloud_provider=log.get("cloud_provider", ""),
            event_name=log.get("event_name", ""),
            matched_conditions={
                "event_type": log.get("event_type", ""),
                "status": log.get("status", "")
            }
        )
    
    # get rules summary
    def get_rules_summary(self) -> Dict:
        """Get a summary of loaded rules."""
        return {
            "total_rules": len(self.rule_loader.rules),
            "attack_patterns": len(self.rule_loader.attack_patterns),
            "by_category": {
                cat: len(self.rule_loader.get_rules_by_category(cat))
                for cat in set(r.category for r in self.rule_loader.rules)
            }
        }

if __name__ == "__main__":
    import json
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    rulebase_path = os.path.join(script_dir, "..", "rulebase.yaml")
    
    engine = RuleEngine(rulebase_path)
    print("\nRule Engine Summary:")
    print(json.dumps(engine.get_rules_summary(), indent=2))
    
    sample_log = {
        "timestamp": "2024-01-15T10:30:00Z",
        "cloud_provider": "aws",
        "event_name": "CreateAccessKey",
        "event_type": "iam",
        "status": "success",
        "actor_id": "suspicious-user",
        "actor_type": "user",
        "source_ip": "203.0.113.50"
    }
    
    alerts = engine.evaluate(sample_log)
    print(f"\n{len(alerts)} alerts generated:")
    for alert in alerts:
        print(f"  - [{alert.severity}] {alert.rule_name}")
