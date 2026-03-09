import sys
import os
import json

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from src.core.normalizer import LogNormalizer
from src.core.integrity import IntegrityManager
from src.core.timestamp import TimestampManager

# This function handles test core pipeline
def test_core_pipeline():
    print("Testing Cryptographic Core Pipeline...")
    
    raw_log = {
        "event_source": "aws.iam",
        "timestamp": "2023-10-27T10:00:00Z",
        "user_identity": "admin",
        "details": {
            "action": "CreateUser",
            "resource": "user-1"
        }
    }
    print(f"Raw Log: {json.dumps(raw_log, indent=2)}")
    
    canonical_log = LogNormalizer.normalize(raw_log)
    print(f"Canonical Log (bytes): {canonical_log}")
    
    integrity = IntegrityManager()
    log_hash = integrity.calculate_hash(canonical_log)
    print(f"Log Hash: {log_hash}")
    
    signature = integrity.sign_hash(log_hash)
    print(f"Signature: {signature[:64]}...")
    
    ts_manager = TimestampManager()
    token = ts_manager.get_timestamp_token(log_hash)
    print(f"Timestamp Token: {json.dumps(token, indent=2)}")
    
    print("\nVerifying...")
    
    is_valid_sig = integrity.verify_signature(log_hash, signature)
    print(f"Signature Valid: {is_valid_sig}")
    
    is_valid_ts = ts_manager.verify_timestamp_token(token, log_hash)
    print(f"Timestamp Valid: {is_valid_ts}")
    
    if is_valid_sig and is_valid_ts:
        print("\nSUCCESS: Core pipeline verified.")
    else:
        print("\nFAILURE: Verification failed.")

if __name__ == "__main__":
    test_core_pipeline()
