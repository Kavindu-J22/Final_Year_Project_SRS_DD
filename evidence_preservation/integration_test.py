import sys
import os
import json
import time

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from src.core.normalizer import LogNormalizer
from src.core.integrity import IntegrityManager
from src.core.timestamp import TimestampManager
from src.storage.ledger import Ledger
from src.verification.verify import EvidenceVerifier

# This function handles run integration test
def run_integration_test():
    print("Starting Integration Test...")
    
    integrity_manager = IntegrityManager()
    timestamp_manager = TimestampManager()
    ledger = Ledger('test_ledger.jsonl')
    
    print("\n[Step 1] Ingestion (Simulated)")
    raw_log = {
        "event_source": "aws.iam",
        "timestamp": "2023-10-27T12:00:00Z",
        "user_identity": "attacker",
        "details": {"action": "DeleteBucket", "bucket": "critical-data"}
    }
    print(f"Raw Log: {json.dumps(raw_log)}")
    
    print("\n[Step 2] Normalization")
    canonical_log_bytes = LogNormalizer.normalize(raw_log)
    print("Log Normalized.")
    
    print("\n[Step 3] Hashing & Signing")
    log_hash = integrity_manager.calculate_hash(canonical_log_bytes)
    signature = integrity_manager.sign_hash(log_hash)
    print(f"Hash: {log_hash}")
    print(f"Signature: {signature[:32]}...")
    
    print("\n[Step 4] Timestamping")
    ts_token = timestamp_manager.get_timestamp_token(log_hash)
    print("Timestamp Token acquired.")
    
    print("\n[Step 5] Storage & Ledger")
    evidence_id = f"ev-{int(time.time())}"
    evidence_data = {
        'evidence_id': evidence_id,
        'log_content': raw_log,
        'evidence_hash': log_hash,
        'digital_signature': signature,
        'trusted_timestamp_token': ts_token
    }
    
    evidence_file = f"{evidence_id}.json"
    with open(evidence_file, 'w') as f:
        f.write(json.dumps(evidence_data, indent=2))
    print(f"Evidence stored locally at {evidence_file}")
    
    ledger.add_entry("Evidence Collected", {'evidence_id': evidence_id, 'hash': log_hash})
    
    print("\n[Step 6] Verification")
    verifier = EvidenceVerifier()
    is_valid = verifier.verify_file(evidence_file)
    
    if is_valid:
        print("\nIntegration Test PASSED.")
    else:
        print("\nIntegration Test FAILED.")
        
    if os.path.exists(evidence_file):
        os.remove(evidence_file)
    if os.path.exists('test_ledger.jsonl'):
        os.remove('test_ledger.jsonl')

if __name__ == "__main__":
    run_integration_test()
