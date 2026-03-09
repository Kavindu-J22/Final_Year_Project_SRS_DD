import boto3
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# This function handles a w s ingestor
class AWSIngestor:
    def __init__(self, bucket_name=None, region_name='us-east-1'):
        """
        Initialize the AWS Ingestor.
        :param bucket_name: S3 bucket name where CloudTrail logs are stored.
        :param region_name: AWS region.
        """
        self.bucket_name = bucket_name
        self.region_name = region_name
        self.s3_client = boto3.client('s3', region_name=self.region_name)
        self.cloudtrail_client = boto3.client('cloudtrail', region_name=self.region_name)

    # This function handles fetch logs from s
    def fetch_logs_from_s3(self, prefix=''):
        """
        Fetch CloudTrail logs directly from S3 bucket.
        Useful for historical ingestion or when EventBridge is not used.
        """
        if not self.bucket_name:
            print("Error: Bucket name not provided.")
            return []

        print(f"Fetching logs from S3 bucket: {self.bucket_name}...")
        try:
            response = self.s3_client.list_objects_v2(Bucket=self.bucket_name, Prefix=prefix)
            if 'Contents' not in response:
                print("No logs found.")
                return []

            logs = []
            for obj in response['Contents']:
                key = obj['Key']
                if key.endswith('.json.gz'):
                    print(f"Found log file: {key}")
            return logs
        except Exception as e:
            print(f"Error fetching logs from S3: {e}")
            return []

    # This function handles lookup events
    def lookup_events(self, start_time=None, end_time=None):
        """
        Use CloudTrail API to lookup events.
        Note: This has rate limits and only looks back 90 days.
        """
        print("Looking up events via CloudTrail API...")
        try:
            kwargs = {}
            if start_time:
                kwargs['StartTime'] = start_time
            if end_time:
                kwargs['EndTime'] = end_time

            response = self.cloudtrail_client.lookup_events(**kwargs)
            events = response.get('Events', [])
            print(f"Found {len(events)} events.")
            for event in events:
                print(json.dumps(event, indent=2, default=str))
            return events
        except Exception as e:
            print(f"Error looking up events: {e}")
            return []

if __name__ == "__main__":
    ingestor = AWSIngestor()
    
    
    print("AWS Ingestor ready. Configure credentials and bucket name to run.")
