import os
from datetime import datetime
from google.cloud import logging
from src.core.utils import WatermarkManager
from dotenv import load_dotenv

load_dotenv()

# This function handles g c p ingestor
class GCPIngestor:
    def __init__(self, project_id=None, db_path='watermarks.db'):
        """
        Initialize GCP Ingestor.
        :param project_id: GCP Project ID.
        :param db_path: Path to SQLite database for watermarks.
        """
        self.project_id = project_id
        self.watermark_manager = WatermarkManager(db_path)
        self.client = logging.Client(project=self.project_id)

    # This function handles fetch logs
    def fetch_logs(self):
        """Fetch logs from GCP Logging."""
        if not self.project_id:
            print("Error: Project ID not provided.")
            return []

        start_time = self.watermark_manager.get_last_timestamp('gcp_logging')
        
        print(f"Fetching GCP logs from {start_time}...")

        filter_str = f'timestamp >= "{start_time.isoformat()}"'

        try:
            entries = self.client.list_entries(filter_=filter_str, order_by=logging.DESCENDING)
            
            logs = []
            count = 0
            max_entries = 100 
            
            for entry in entries:
                log_entry = {
                    'timestamp': entry.timestamp.isoformat() if entry.timestamp else None,
                    'payload': entry.payload,
                    'severity': entry.severity,
                    'insert_id': entry.insert_id,
                    'resource': entry.resource.labels if entry.resource else {}
                }
                logs.append(log_entry)
                count += 1
                if count >= max_entries:
                    break
            
            
            print(f"Fetched {len(logs)} logs.")
            
            if logs:
                newest_log_time = logs[0].get('timestamp')
                if newest_log_time:
                    if isinstance(newest_log_time, str):
                        newest_log_time = datetime.fromisoformat(newest_log_time.replace('Z', '+00:00'))
                    
                    self.watermark_manager.update_watermark('gcp_logging', newest_log_time)

            return logs

        except Exception as e:
            print(f"Error fetching GCP logs: {e}")
            return []

if __name__ == "__main__":
    ingestor = GCPIngestor(project_id=os.environ.get('GCP_PROJECT_ID'))
    print("GCP Ingestor ready. Configure Project ID to run.")
