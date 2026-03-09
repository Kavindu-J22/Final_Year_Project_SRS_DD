import json
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from src.core.integrity import IntegrityManager
from src.core.timestamp import TimestampManager

# This function handles evidence verifier
class EvidenceVerifier:
    def __init__(self):
        self.integrity_manager = IntegrityManager()
        self.timestamp_manager = TimestampManager()

    def verify_file(self, file_path):
        """
        Verify the evidence file.
        Checks:
        1. Hash integrity (re-calculate hash of log content).
        2. Digital Signature (verify signature of hash).
        3. Trusted Timestamp (verify token).
        """
        print(f"Verifying evidence file: {file_path}")
        
        try:
            with open(file_path, 'r') as f:
                evidence = json.loads(f.read())
            
            log_content = evidence.get('log_content')
            stored_hash = evidence.get('evidence_hash')
            signature = evidence.get('digital_signature')
            timestamp_token = evidence.get('trusted_timestamp_token')
            
            if not all([log_content, stored_hash, signature, timestamp_token]):
                print("Error: Missing components in evidence file.")
                return False

            from src.core.normalizer import LogNormalizer
            canonical_log = LogNormalizer.normalize(log_content)
            calculated_hash = self.integrity_manager.calculate_hash(canonical_log)
            
            if calculated_hash != stored_hash:
                print("FAIL: Hash mismatch! Evidence may have been tampered with.")
                print(f"Stored:     {stored_hash}")
                print(f"Calculated: {calculated_hash}")
                return False
            print("PASS: Hash integrity verified.")
            
            if not self.integrity_manager.verify_signature(stored_hash, signature):
                print("FAIL: Digital Signature invalid! Source cannot be authenticated.")
                return False
            print("PASS: Digital Signature verified.")
            
            if not self.timestamp_manager.verify_timestamp_token(timestamp_token, stored_hash):
                print("FAIL: Timestamp token invalid!")
                return False
            print("PASS: Trusted Timestamp verified.")
            
            print("\nCONCLUSION: Evidence is VALID and ADMISSIBLE.")
            return True

        except Exception as e:
            print(f"Error during verification: {e}")
            return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_evidence.py <path_to_evidence_file>")
    else:
        verifier = EvidenceVerifier()
        verifier.verify_file(sys.argv[1])
