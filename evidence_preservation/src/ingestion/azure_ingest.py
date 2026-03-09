import os
from datetime import datetime
from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient, LogsQueryStatus
from src.core.utils import WatermarkManager
from dotenv import load_dotenv

load_dotenv()

# This function handles azure ingestor
class AzureIngestor:
    def __init__(self, workspace_id=None, db_path='watermarks.db'):
        """
        Initialize Azure Ingestor.
        :param workspace_id: Azure Log Analytics Workspace ID.
        :param db_path: Path to SQLite database for watermarks.
        """
        self.workspace_id = workspace_id
        self.watermark_manager = WatermarkManager(db_path)
        self.credential = DefaultAzureCredential()
        self.client = LogsQueryClient(self.credential)

    # This function handles fetch logs
    def fetch_logs(self):
        """Fetch logs from Azure Monitor."""
        if not self.workspace_id:
            print("Error: Workspace ID not provided.")
            return []

        start_time = self.watermark_manager.get_last_timestamp('azure_monitor')
        end_time = datetime.utcnow()
        
        print(f"Fetching Azure logs from {start_time} to {end_time}...")

        query = "AzureActivity | sort by TimeGenerated asc"
        
        try:
            response = self.client.query_workspace(
                workspace_id=self.workspace_id,
                query=query,
                timespan=(start_time, end_time)
            )

            if response.status == LogsQueryStatus.PARTIAL:
                print("Warning: Partial data returned.")
            
            logs = []
            if response.tables:
                for table in response.tables:
                    for row in table.rows:
                        log_entry = dict(zip([col.name for col in table.columns], row))
                        logs.append(log_entry)
            
            print(f"Fetched {len(logs)} logs.")
            
            if logs:
                last_log_time = logs[-1].get('TimeGenerated')
                if isinstance(last_log_time, str):
                    last_log_time = datetime.fromisoformat(last_log_time.replace('Z', '+00:00'))
                
                if last_log_time:
                    self.watermark_manager.update_watermark('azure_monitor', last_log_time)
                    
            return logs

        except Exception as e:
            print(f"Error fetching Azure logs: {e}")
            return []

if __name__ == "__main__":
    ingestor = AzureIngestor(workspace_id=os.environ.get('AZURE_WORKSPACE_ID'))
    print("Azure Ingestor ready. Configure Workspace ID to run.")
