import boto3
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

load_dotenv()

# This function handles create locked bucket
def create_locked_bucket():
    bucket_name = os.getenv('AWS_S3_BUCKET_NAME')
    region = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')

    if not bucket_name:
        print("Error: AWS_S3_BUCKET_NAME not set in .env")
        return

    print(f"Creating bucket '{bucket_name}' in region '{region}' with Object Lock enabled...")

    try:
        s3 = boto3.client('s3', region_name=region)
        
        if region == 'us-east-1':
            s3.create_bucket(
                Bucket=bucket_name,
                ObjectLockEnabledForBucket=True
            )
        else:
            s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={'LocationConstraint': region},
                ObjectLockEnabledForBucket=True
            )
            
        print(f"Success! Bucket '{bucket_name}' created with Object Lock enabled.")
        print("You can now verify this in the AWS Console.")
        
    except Exception as e:
        print(f"Error creating bucket: {e}")

if __name__ == "__main__":
    create_locked_bucket()
