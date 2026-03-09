"""
Evidence Preservation & Chain of Custody API
IT22581402 - Component 3

Cryptographic hash chaining with RSA signatures for tamper-proof evidence
Run: uvicorn api:app --port 8003
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import hashlib, json, os
from datetime import datetime

app = FastAPI(
    title="Evidence Preservation & Chain of Custody API",
    description="Cryptographically secure evidence ledger",
    version="1.0.0"
)

# Data models
class EvidenceEntry(BaseModel):
    log_id: str = Field(..., example="log_12345")
    timestamp: str = Field(..., example="2026-01-05T02:00:00Z")
    event_type: str = Field(..., example="UserLogin")
    user_id: str = Field(..., example="admin@example.com")
    action: str = Field(..., example="Accessed /admin/users")
    metadata: Dict[str, Any] = Field(default_factory=dict)

class EvidenceBlock(BaseModel):
    block_index: int
    timestamp: str
    data: Dict[str, Any]
    current_hash: str
    previous_hash: str
    signature: str

class PreservationResponse(BaseModel):
    status: str
    block_index: int
    hash: str
    signature: str
    message: str

class VerificationResult(BaseModel):
    is_valid: bool
    total_blocks: int
    blocks_verified: int
    tampered_blocks: List[int]
    broken_links: List[int]
    verification_time_ms: float
    message: str

class ChainStats(BaseModel):
    total_blocks: int
    first_block_time: Optional[str] = None
    last_block_time: Optional[str] = None
    chain_hash: str
    integrity_status: str

class HealthResponse(BaseModel):
    status: str
    keys_loaded: bool
    chain_blocks: int
    api_version: str

# State management
EVIDENCE_CHAIN: List[EvidenceBlock] = []
PRIVATE_KEY = None
PUBLIC_KEY = None

# Key management
def load_keys():
    global PRIVATE_KEY, PUBLIC_KEY
    keys_dir = "../keys"
    try:
        if os.path.exists(f"{keys_dir}/private_key.pem"):
            with open(f"{keys_dir}/private_key.pem", "rb") as f:
                PRIVATE_KEY = serialization.load_pem_private_key(f.read(), password=None, backend=default_backend())
        if os.path.exists(f"{keys_dir}/public_key.pem"):
            with open(f"{keys_dir}/public_key.pem", "rb") as f:
                PUBLIC_KEY = serialization.load_pem_public_key(f.read(), backend=default_backend())
    except Exception as e:
        print(f"Warning: {e}")

def canonicalize_data(data: dict) -> bytes:
    return json.dumps(data, sort_keys=True, separators=(',', ':')).encode('utf-8')

def calculate_hash(data: bytes, previous_hash: str) -> str:
    return hashlib.sha256(data + previous_hash.encode('utf-8')).hexdigest()

def sign_hash(hash_str: str) -> str:
    if not PRIVATE_KEY:
        raise ValueError("Private key not loaded")
    signature = PRIVATE_KEY.sign(hash_str.encode('utf-8'), padding.PKCS1v15(), hashes.SHA256())
    return signature.hex()

def verify_signature(hash_str: str, signature_hex: str) -> bool:
    if not PUBLIC_KEY:
        raise ValueError("Public key not loaded")
    try:
        PUBLIC_KEY.verify(bytes.fromhex(signature_hex), hash_str.encode('utf-8'),
                         padding.PKCS1v15(), hashes.SHA256())
        return True
    except:
        return False

def verify_chain() -> VerificationResult:
    start_time = datetime.now()
    if len(EVIDENCE_CHAIN) == 0:
        return VerificationResult(is_valid=True, total_blocks=0, blocks_verified=0,
                                 tampered_blocks=[], broken_links=[], verification_time_ms=0.0,
                                 message="Chain is empty")
    
    tampered, broken_links = [], []
    for i, block in enumerate(EVIDENCE_CHAIN):
        canonical_data = canonicalize_data(block.data)
        prev_hash = EVIDENCE_CHAIN[i-1].current_hash if i > 0 else "0" * 64
        expected_hash = calculate_hash(canonical_data, prev_hash)
        if expected_hash != block.current_hash or not verify_signature(block.current_hash, block.signature):
            tampered.append(i)
        if i > 0 and block.previous_hash != EVIDENCE_CHAIN[i-1].current_hash:
            broken_links.append(i)
    
    verification_time = (datetime.now() - start_time).total_seconds() * 1000
    is_valid = len(tampered) == 0 and len(broken_links) == 0
    return VerificationResult(
        is_valid=is_valid, total_blocks=len(EVIDENCE_CHAIN),
        blocks_verified=len(EVIDENCE_CHAIN) - len(tampered),
        tampered_blocks=tampered, broken_links=broken_links,
        verification_time_ms=round(verification_time, 2),
        message="Chain is valid" if is_valid else "Chain integrity compromised"
    )

load_keys()

# API endpoints
@app.get("/", response_model=HealthResponse)
async def root():
    return {"status": "healthy", "keys_loaded": PRIVATE_KEY is not None and PUBLIC_KEY is not None,
            "chain_blocks": len(EVIDENCE_CHAIN), "api_version": "1.0.0"}

@app.post("/preserve", response_model=PreservationResponse)
async def preserve_evidence(entry: EvidenceEntry):
    if not PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="Signing key not available")
    
    previous_hash = EVIDENCE_CHAIN[-1].current_hash if EVIDENCE_CHAIN else "0" * 64
    data_dict = entry.dict()
    canonical_data = canonicalize_data(data_dict)
    current_hash = calculate_hash(canonical_data, previous_hash)
    signature = sign_hash(current_hash)
    
    block = EvidenceBlock(
        block_index=len(EVIDENCE_CHAIN), timestamp=datetime.utcnow().isoformat(),
        data=data_dict, current_hash=current_hash, previous_hash=previous_hash, signature=signature
    )
    EVIDENCE_CHAIN.append(block)
    
    return PreservationResponse(status="preserved", block_index=block.block_index, hash=current_hash,
                                signature=signature, message=f"Evidence block {block.block_index} added to chain")

@app.post("/verify", response_model=VerificationResult)
async def verify_chain_integrity():
    return verify_chain()

@app.get("/chain", response_model=List[EvidenceBlock])
async def get_chain(limit: int = 100):
    return EVIDENCE_CHAIN[-limit:]

@app.get("/block/{index}", response_model=EvidenceBlock)
async def get_block(index: int):
    if index < 0 or index >= len(EVIDENCE_CHAIN):
        raise HTTPException(status_code=404, detail=f"Block {index} not found")
    return EVIDENCE_CHAIN[index]

@app.get("/stats", response_model=ChainStats)
async def get_chain_stats():
    if not EVIDENCE_CHAIN:
        return ChainStats(total_blocks=0, chain_hash="N/A", integrity_status="EMPTY")
    verification = verify_chain()
    return ChainStats(
        total_blocks=len(EVIDENCE_CHAIN), first_block_time=EVIDENCE_CHAIN[0].timestamp,
        last_block_time=EVIDENCE_CHAIN[-1].timestamp, chain_hash=EVIDENCE_CHAIN[-1].current_hash,
        integrity_status="VALID" if verification.is_valid else "COMPROMISED"
    )

@app.get("/sample-data/log", response_model=EvidenceEntry)
async def get_sample_log():
    return EvidenceEntry(log_id="sample_001", timestamp=datetime.utcnow().isoformat(),
                        event_type="UserLogin", user_id="test.user@company.com",
                        action="Authenticated via SSO", metadata={"ip": "192.168.1.50", "device": "MacBook Pro"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
