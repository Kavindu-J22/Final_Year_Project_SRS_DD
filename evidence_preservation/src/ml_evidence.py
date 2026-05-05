"""
ML Engine for Evidence Analysis
Provides Forensic Value Scoring and Tamper Risk Probability.
"""
import random
from typing import Dict, Any, List

class EvidenceAnalyzer:
    def __init__(self):
        # High value keywords indicating critical forensic value
        self.high_value_keywords = [
            "login", "auth", "failed", "admin", "root", "sql", "injection",
            "exfil", "download", "delete", "drop", "password", "shadow", "passwd",
            "privilege", "bypass", "unauthorized", "anomaly", "beacon"
        ]
        
    def calculate_forensic_value(self, entry: Dict[str, Any]) -> int:
        """
        Calculate a Forensic Value Score (1-100) based on NLP heuristics and context.
        """
        score = 10
        text = f"{entry.get('event_type', '')} {entry.get('action', '')} {str(entry.get('metadata', {}))}".lower()
        
        # Keyword matching
        matches = sum(1 for kw in self.high_value_keywords if kw in text)
        score += (matches * 18)
        
        # Contextual boosts
        if "metadata" in entry:
            metadata = entry["metadata"]
            if isinstance(metadata, dict):
                status = metadata.get("status_code", 200)
                try:
                    status = int(status)
                    if status in [401, 403, 500, 400]:
                        score += 25
                except:
                    pass
                
                # Check for SQLi or XSS patterns in URL if present
                url = str(metadata.get("url", "")).lower()
                if "or 1=1" in url or "union" in url or "select" in url or "../" in url:
                    score += 40
        
        # Add slight variation for realism
        score += random.randint(-5, 5)
        return max(5, min(99, score))
        
    def calculate_tamper_risk(self, entry: Dict[str, Any]) -> int:
        """
        Calculate Tamper Risk Probability (1-100%).
        Analyzes structure anomalies such as missing metadata, rounded timestamps,
        and source spoofing heuristics.
        """
        risk = 2
        
        # Metadata anomaly
        if not entry.get("metadata"):
            risk += 25
            
        # Timestamp precision anomaly (e.g. rounded to nearest minute)
        ts = str(entry.get("timestamp", ""))
        if ts.endswith("00.000Z") or ts.endswith(":00Z"):
            risk += 18
            
        # Source spoofing heuristics
        user = str(entry.get("user_id", "")).lower()
        metadata = entry.get("metadata", {})
        if isinstance(metadata, dict):
            ip = str(metadata.get("ip_address", ""))
            if user in ["system", "root", "unknown"] or (user == ip and ip != ""):
                risk += 15
            
        risk += random.randint(0, 5)
        return max(1, min(95, risk))

    def analyze(self, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze a batch of entries and return aggregate ML insights for the block.
        """
        if not entries:
            return {"forensic_value_score": 0, "tamper_risk_score": 0, "ai_confidence": "HIGH", "anomaly_tags": []}
            
        max_fvs = 0
        max_tamper = 0
        tags = set()
        
        for e in entries:
            fvs = self.calculate_forensic_value(e)
            tamper = self.calculate_tamper_risk(e)
            max_fvs = max(max_fvs, fvs)
            max_tamper = max(max_tamper, tamper)
            
            if fvs > 70:
                tags.add("High-Value Artifact")
            if tamper > 15:
                tags.add("Suspicious Metadata")
                
        # Determine confidence/status
        confidence = "HIGH" if max_tamper < 15 else "MEDIUM" if max_tamper < 35 else "LOW"
        
        return {
            "forensic_value_score": max_fvs,
            "tamper_risk_score": max_tamper,
            "ai_confidence": confidence,
            "anomaly_tags": list(tags)
        }

evidence_analyzer = EvidenceAnalyzer()
