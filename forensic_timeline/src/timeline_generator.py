import requests
import re
import pandas as pd
from datetime import datetime
import os

class RealLogLoader:
    """
    Downloads and parses real-world Apache logs from LogHub.
    Includes capability to inject synthetic APT attack patterns for forensic training.
    """
    
    LOG_URL = "https://raw.githubusercontent.com/elastic/examples/master/Common%20Data%20Formats/apache_logs/apache_logs"
    
    def __init__(self, data_dir="../data", log_filename="access.log"):
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)
        self.raw_log_path = os.path.join(self.data_dir, log_filename)
        self.processed_json_path = os.path.join(self.data_dir, "forensic_corpus.json")

    def download_real_logs(self):
        """Downloads the dataset if not present."""
        if os.path.exists(self.raw_log_path):
            print(f"[INFO] Using existing logs at {self.raw_log_path}")
            return

        print(f"[INFO] Downloading real logs from {self.LOG_URL}...")
        try:
            r = requests.get(self.LOG_URL)
            r.raise_for_status()
            with open(self.raw_log_path, 'w', encoding='utf-8') as f:
                f.write(r.text)
            print("[SUCCESS] Download complete.")
        except Exception as e:
            print(f"[ERROR] Failed to download logs: {e}")

    def parse_logs(self):
        """Parses Apache CLF logs into a DataFrame."""
        if not os.path.exists(self.raw_log_path):
            self.download_real_logs()

        print("[INFO] Parsing logs...")
        # Regex for Common Log Format (CLF)
        # 10.10.10.10 - - [26/Dec/2025:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234
        regex = r'^(\S+) \S+ \S+ \[([\w:/]+\s[+\-]\d{4})\] "(\S+) (\S+)\s*(\S+)?\s*" (\d{3}) (\S+)'
        
        data = []
        with open(self.raw_log_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                match = re.match(regex, line.strip())
                if match:
                    try:
                        ts_str = match.group(2)
                        # Remove timezone for simplicity in this demo or handle it
                        ts = datetime.strptime(ts_str.split(' ')[0], '%d/%b/%Y:%H:%M:%S')
                    except:
                        ts = datetime.now()

                    data.append({
                        "timestamp": ts,
                        "src_ip": match.group(1),
                        "method": match.group(3),
                        "path": match.group(4),
                        "status": match.group(6),
                        "size": match.group(7),
                        "log_type": "apache_access",
                        "raw": line.strip()
                    })
        
        return pd.DataFrame(data)

    def inject_apt_attacks(self, df):
        """Injects simulated APT attack patterns into the real background noise."""
        print("[INFO] Injecting APT Attack Vectors...")
        attacks = []
        base_time = df['timestamp'].max()
        
        # Scenario: SQL Injection -> Web Shell -> Data Exfil
        attacker_ip = "192.168.1.105"
        
        # 1. Recon (Nmap/Scanning)
        attacks.append({
            "timestamp": base_time,
            "src_ip": attacker_ip,
            "method": "GET",
            "path": "/admin/scan",
            "status": "404",
            "size": "0",
            "log_type": "apache_access",
            "raw": f'{attacker_ip} - - [{base_time}] "GET /admin/scan HTTP/1.1" 404 0'
        })
        
        # 2. Exploitation (SQL Injection)
        attacks.append({
            "timestamp": base_time,
            "src_ip": attacker_ip,
            "method": "GET",
            "path": "/login.php?user=admin' OR '1'='1",
            "status": "200",
            "size": "500",
            "log_type": "apache_access",
            "raw": f'{attacker_ip} - - [{base_time}] "GET /login.php?user=admin\' OR \'1\'=\'1 HTTP/1.1" 200 500'
        })
        
        # 3. Persistence (Web Shell Upload)
        attacks.append({
            "timestamp": base_time,
            "src_ip": attacker_ip,
            "method": "POST",
            "path": "/uploads/shell.php",
            "status": "201",
            "size": "1024",
            "log_type": "apache_access",
            "raw": f'{attacker_ip} - - [{base_time}] "POST /uploads/shell.php HTTP/1.1" 201 1024'
        })

        return pd.concat([df, pd.DataFrame(attacks)], ignore_index=True)

class ForensicReportGenerator:
    """Automated narrative synthesis for timeline data"""
    
    def generate_narrative(self, logs, clusters, anomalies) -> str:
        if not logs:
            return "No logs provided for analysis."
        
        try:
            # logs might be objects with .timestamp or dicts
            start_time = min((getattr(l, 'timestamp', None) or l['timestamp'] for l in logs), default="Unknown timeframe")
            end_time = max((getattr(l, 'timestamp', None) or l['timestamp'] for l in logs), default="Unknown timeframe")
        except:
            start_time = "Unknown"
            end_time = "Unknown"
            
        narrative = f"# Automated Forensic Incident Report\n\n"
        narrative += f"**Time Window:** {start_time} to {end_time}\n"
        narrative += f"**Total Log Events Analyzed:** {len(logs)}\n"
        narrative += f"**Distinct Behavioral Clusters:** {len([c for c in clusters if c.cluster_id != -1])}\n\n"
        
        if anomalies:
            narrative += "## Executive Summary: Threat Detected\n"
            narrative += f"The DBSCAN semantic clustering engine, utilizing TF-IDF n-gram (1,3) feature extraction, identified **{len(anomalies)} anomalous events** indicating potential adversarial behavior.\n\n"
            
            for a in anomalies:
                # Handle dict or object
                ts = getattr(a, 'timestamp', None) or a.get('timestamp', 'N/A')
                sev = getattr(a, 'severity', None) or a.get('severity', 'HIGH')
                pat = getattr(a, 'suspicious_pattern', None) or a.get('suspicious_pattern', '')
                rsn = getattr(a, 'reason', None) or a.get('reason', '')
                narrative += f"- **[{ts}] [Severity: {sev}]** {rsn}\n  - Payload/Path: `{pat}`\n"
                
            narrative += "\n## AI Predicted Sequence & Suggestions\n"
            narrative += "Based on the ML cluster analysis, the following adversarial behavioral chain is predicted:\n"
            
            # Dynamic sequencing based on actual anomalies
            anomaly_types = set()
            for a in anomalies:
                rsn = getattr(a, 'reason', None) or a.get('reason', '')
                for r in rsn.split('; '):
                    anomaly_types.add(r)
                    
            if "SQL Injection Attempt" in anomaly_types or "Path Traversal (LFI)" in anomaly_types:
                narrative += "1. **Initial Access / Reconnaissance**: Targeted probing of the application perimeter.\n"
                narrative += "2. **Exploitation Phase**: Payload execution to bypass authentication or read local files.\n"
                narrative += "   - *Suggestion*: Audit input sanitization and implement strict WAF filtering.\n"
            
            if "Web Shell Upload" in anomaly_types:
                narrative += "1. **Persistence & RCE**: A malicious web shell was likely uploaded successfully.\n"
                narrative += "2. **Command Execution**: Attacker is establishing a foothold to execute arbitrary system commands.\n"
                narrative += "   - *Suggestion*: Quarantine the `/uploads` directory immediately and inspect file integrity monitoring alerts.\n"
                
            if "Privilege Escalation" in anomaly_types:
                narrative += "1. **Lateral Movement / Escalation**: An identity attempting to attach unauthorized admin privileges.\n"
                narrative += "   - *Suggestion*: Revoke compromised tokens and enforce Principle of Least Privilege (PoLP) on IAM roles.\n"
                
            if "Ransomware Mass Encryption" in anomaly_types:
                narrative += "1. **Impact**: Massive file modification consistent with ransomware encryption algorithms.\n"
                narrative += "2. **Extortion**: Attacker will likely drop a ransom note and demand payment.\n"
                narrative += "   - *Suggestion*: Immediately isolate the affected cloud bucket and initiate emergency data backups.\n"
                
            if "Defense Evasion (Audit Cleared)" in anomaly_types:
                narrative += "1. **Defense Evasion**: The attacker explicitly targeted CloudTrail/Audit logs for deletion to cover their tracks.\n"
                narrative += "   - *Suggestion*: Lock down IAM permissions regarding log deletion and review offline syslog backups.\n"
                
            if "Distributed Credential Stuffing" in anomaly_types or "Impossible Travel" in anomaly_types or "Low & Slow AI Evasion" in anomaly_types:
                narrative += "1. **Advanced Evasion**: The attacker is utilizing advanced ML-evasion techniques (distributed IPs or time-delays).\n"
                narrative += "   - *Suggestion*: Enforce mandatory MFA immediately and lower the rate-limiting threshold for anomalous IP subsets.\n"
                
            if len(anomaly_types) == 0:
                 narrative += "1. **Anomalous Activity**: Deviations detected from standard behavior profiles.\n"
                 narrative += "   - *Suggestion*: Investigate the anomaly source IPs manually.\n"

        else:
            narrative += "## Executive Summary\n"
            narrative += "The clustering engine analyzed the semantic properties of the provided payloads and found **no critical anomalies** or deviations from established baselines.\n\n"
            narrative += "All traffic aligned with standard benign behavioral clusters.\n"
            
        narrative += "\n---\n*Report generated automatically by the Semantic Clustering Engine.*"
        return narrative
