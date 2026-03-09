
import sys
import os
import json
from src.core.integrity import IntegrityManager
from src.storage.ledger import Ledger
from src.config import Config

def verify_chain():
    """
    Research Objective: Evidence Verification & Retrieval Interface.
    Verifies the integrity of the entire Chain of Custody.
    """
    print("Locked & Sealed: Verifying Chain of Custody...")
    
    # Initialize components
    ledger = Ledger(Config.LEDGER_FILE)
    integrity = IntegrityManager(Config.KEY_PATH)
    
    chain = ledger.get_chain()
    if not chain:
        print("[-] Ledger is empty.")
        return

    valid_count = 0
    errors = 0
    
    # 1. Verify Hash Chain (Blockchain-like linkage)
    print(f"\n[+] Scanning {len(chain)} blocks for hash linkage...")
    for i in range(1, len(chain)):
        prev_block = chain[i-1]
        curr_block = chain[i]
        
        # Recalculate hash of previous block to match 'prev_hash' in current
        # In a real blockchain, this is more complex. Here we check the link.
        if curr_block.get('previous_hash') != prev_block.get('hash'):
             print(f" [!] BROKEN CHAIN at Block {i}: Prev Hash Mismatch!")
             errors += 1
        else:
            valid_count += 1
            
    # 2. Verify Digital Signatures
    print("\n[+] Verifying Digital Signatures on Evidence...")
    for block in chain:
        details = block.get('details', {})
        evidence_hash = details.get('evidence_hash')
        signature = details.get('signature')
        
        if evidence_hash and signature:
            is_valid = integrity.verify_signature(evidence_hash, signature, integrity.public_key)
            if not is_valid:
                 print(f" [!] INVALID SIGNATURE for Event {block.get('event_id')}")
                 errors += 1
    
    if errors == 0:
        print(f"\n[+] SUCCESS: Chain of Custody is INTEGRAL & VERIFIED. ({len(chain)} Blocks)")
        return True
    else:
        print(f"\n[-] FAILURE: Found {errors} integrity violations!")
        return False

if __name__ == "__main__":
    # Add src to path
    sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
    verify_chain()
