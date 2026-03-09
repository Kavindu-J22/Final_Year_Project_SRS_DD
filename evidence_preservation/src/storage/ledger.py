import os
import json
import hashlib
from datetime import datetime
import time
from ..config import Config

# This function handles ledger
class Ledger:
    def __init__(self, ledger_file=None):
        self.ledger_file = ledger_file or Config.LEDGER_FILE
        self._init_ledger()

    # This function handles init ledger
    def _init_ledger(self):
        """Initialize ledger with genesis block if empty."""
        if not os.path.exists(self.ledger_file):
            genesis_entry = {
                'index': 0,
                'timestamp': datetime.utcnow().isoformat(),
                'action': 'System Initialized',
                'previous_hash': '0' * 64,
                'hash': ''
            }
            genesis_entry['hash'] = self._calculate_entry_hash(genesis_entry)
            with open(self.ledger_file, 'w') as f:
                f.write(json.dumps(genesis_entry) + '\n')

    # This function handles calculate entry hash
    def _calculate_entry_hash(self, entry):
        """Calculate hash of the entry (excluding the hash field itself)."""
        entry_copy = entry.copy()
        if 'hash' in entry_copy:
            del entry_copy['hash']
        encoded = json.dumps(entry_copy, sort_keys=True).encode('utf-8')
        return hashlib.sha256(encoded).hexdigest()

    # This function handles get last entry
    def get_last_entry(self):
        """Get the last entry in the ledger."""
        last_line = None
        if os.path.exists(self.ledger_file):
            with open(self.ledger_file, 'r') as f:
                for line in f:
                    if line.strip():
                        last_line = line
        if last_line:
            return json.loads(last_line)
        return None

    # This function handles get chain
    def get_chain(self):
        """Return the full chain of custody."""
        chain = []
        if os.path.exists(self.ledger_file):
            with open(self.ledger_file, 'r') as f:
                for line in f:
                    if line.strip():
                        chain.append(json.loads(line))
        return chain

    # This function handles add entry
    def add_entry(self, action, details=None):
        """
        Add a new entry to the ledger.
        :param action: Description of the action (e.g., "Evidence Collected").
        :param details: Dictionary of details (e.g., Evidence ID, User).
        """
        last_entry = self.get_last_entry()
        if not last_entry:
            self._init_ledger()
            last_entry = self.get_last_entry()

        new_index = last_entry['index'] + 1
        previous_hash = last_entry['hash']
        
        entry = {
            'index': new_index,
            'timestamp': datetime.utcnow().isoformat(),
            'action': action,
            'details': details or {},
            'previous_hash': previous_hash,
            'hash': ''
        }
        
        entry['hash'] = self._calculate_entry_hash(entry)
        
        with open(self.ledger_file, 'a') as f:
            f.write(json.dumps(entry) + '\n')
            
        print(f"Ledger updated: Index {new_index}")
        return entry

    # This function handles verify ledger
    def verify_ledger(self):
        """Verify the integrity of the ledger chain."""
        print("Verifying ledger integrity...")
        if not os.path.exists(self.ledger_file):
            print("Ledger file not found.")
            return False

        previous_hash = '0' * 64
        is_valid = True
        
        with open(self.ledger_file, 'r') as f:
            for i, line in enumerate(f):
                if not line.strip():
                    continue
                entry = json.loads(line)
                
                if entry['index'] != i:
                    print(f"Index mismatch at line {i+1}")
                    is_valid = False
                
                if entry['previous_hash'] != previous_hash:
                    print(f"Hash chain broken at index {entry['index']}")
                    print(f"Expected prev: {previous_hash}")
                    print(f"Actual prev:   {entry['previous_hash']}")
                    is_valid = False
                
                calculated_hash = self._calculate_entry_hash(entry)
                if calculated_hash != entry['hash']:
                    print(f"Hash mismatch at index {entry['index']}")
                    is_valid = False
                
                previous_hash = entry['hash']
        
        if is_valid:
            print("Ledger integrity verified.")
        else:
            print("Ledger integrity check FAILED.")
        return is_valid
