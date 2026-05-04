import hashlib
import json
from typing import List, Dict, Any

def hash_leaf(data: Dict[str, Any]) -> str:
    """Canonicalize and hash a single evidence entry."""
    canonical = json.dumps(data, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(canonical).hexdigest()

def hash_node(left: str, right: str) -> str:
    """Hash two child nodes together to form a parent node."""
    return hashlib.sha256((left + right).encode('utf-8')).hexdigest()

class MerkleTree:
    """
    Constructs a Merkle Tree from a list of evidence entries (dictionaries).
    Used to batch multiple logs into a single verifiable cryptographic root.
    """
    def __init__(self, entries: List[Dict[str, Any]]):
        self.entries = entries
        self.leaves = [hash_leaf(entry) for entry in entries]
        self.tree = self._build_tree(self.leaves)

    def _build_tree(self, nodes: List[str]) -> List[List[str]]:
        if not nodes:
            return []
        
        tree = [nodes]
        current_level = nodes

        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                # If odd number of nodes, duplicate the last one
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                next_level.append(hash_node(left, right))
            tree.append(next_level)
            current_level = next_level

        return tree

    @property
    def root(self) -> str:
        """Get the Merkle Root of the tree."""
        if not self.tree:
            # Empty tree hash
            return hashlib.sha256(b"").hexdigest()
        return self.tree[-1][0]
    
    def verify_integrity(self) -> bool:
        """Verify that the current entries match the stored Merkle Root."""
        recalculated_leaves = [hash_leaf(entry) for entry in self.entries]
        if recalculated_leaves != self.leaves:
            return False
        
        # Recalculate tree to check root
        new_tree = self._build_tree(recalculated_leaves)
        return new_tree[-1][0] == self.root if new_tree else self.root == hashlib.sha256(b"").hexdigest()

