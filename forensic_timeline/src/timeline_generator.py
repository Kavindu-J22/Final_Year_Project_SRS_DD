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
