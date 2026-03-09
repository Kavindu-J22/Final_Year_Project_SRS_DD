import boto3
import json
import hashlib
from botocore.exceptions import ClientError

# This function handles storage connector
class StorageConnector:
    def __init__(self, bucket_name, region_name='us-east-1'):
        self.bucket_name = bucket_name
        self.s3_client = boto3.client('s3', region_name=region_name)

    def upload_evidence(self, evidence_id, evidence_data, retention_days=365):
        """
        Upload evidence to S3 with Object Lock.
        :param evidence_id: Unique ID for the evidence (used as key).
        :param evidence_data: Dictionary containing log, hash, signature, timestamp.
        :param retention_days: Number of days to retain the object.
        """
        try:
            body = json.dumps(evidence_data).encode('utf-8')
            
            md5 = hashlib.md5(body).digest()
            import base64
            content_md5 = base64.b64encode(md5).decode('utf-8')

            print(f"Uploading evidence {evidence_id} to {self.bucket_name} with Object Lock...")
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=f"evidence/{evidence_id}.json",
                Body=body,
                ContentMD5=content_md5,
                ObjectLockMode='COMPLIANCE',
                ObjectLockRetainUntilDate=self._calculate_retention_date(retention_days)
            )
            print("Upload successful.")
            return True
        except ClientError as e:
            print(f"Error uploading evidence: {e}")
            return False
        except Exception as e:
            print(f"Unexpected error: {e}")
            return False

    # This function handles calculate retention date
    def _calculate_retention_date(self, days):
        from datetime import datetime, timedelta
        return datetime.utcnow() + timedelta(days=days)

    def get_evidence(self, evidence_id):
        """Retrieve evidence from S3."""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=f"evidence/{evidence_id}.json"
            )
            return json.loads(response['Body'].read())
        except Exception as e:
            print(f"Error retrieving evidence: {e}")
            return None
