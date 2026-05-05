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
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import hashlib, json, os, logging, sys, asyncio
from datetime import datetime

# Import MerkleTree and ML Analyzer
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
try:
    from core.merkle import MerkleTree
except ImportError:
    MerkleTree = None

try:
    from ml_evidence import evidence_analyzer
except ImportError:
    evidence_analyzer = None

logger = logging.getLogger("evidence_preservation")

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
    entries: List[Dict[str, Any]]
    merkle_root: str
    current_hash: str
    previous_hash: str
    signature: str
    ml_insights: Optional[Dict[str, Any]] = None

class PreservationResponse(BaseModel):
    status: str
    block_index: int
    merkle_root: str
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
INTEGRITY_STATUS = "VALID"
LAST_HEARTBEAT = "Never"

# Key management
def load_keys():
    global PRIVATE_KEY, PUBLIC_KEY
    # Resolve keys/ folder relative to this file's location so the service
    # works correctly regardless of which directory uvicorn is launched from.
    base_dir  = os.path.dirname(os.path.abspath(__file__))
    keys_dir  = os.path.join(base_dir, "..", "keys")
    os.makedirs(keys_dir, exist_ok=True)
    priv_path = os.path.join(keys_dir, "private_key.pem")
    pub_path  = os.path.join(keys_dir, "public_key.pem")

    try:
        if os.path.exists(priv_path) and os.path.exists(pub_path):
            # Load existing keys — no backend= arg (removed in cryptography 42+)
            with open(priv_path, "rb") as f:
                PRIVATE_KEY = serialization.load_pem_private_key(f.read(), password=None)
            with open(pub_path, "rb") as f:
                PUBLIC_KEY = serialization.load_pem_public_key(f.read())
            logger.info("[Evidence] RSA keys loaded from %s", os.path.abspath(keys_dir))
        else:
            # Auto-generate a fresh RSA-2048 key pair and persist it
            logger.info("[Evidence] RSA keys not found — generating new RSA-2048 key pair ...")
            PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
            PUBLIC_KEY = PRIVATE_KEY.public_key()

            with open(priv_path, "wb") as f:
                f.write(PRIVATE_KEY.private_bytes(
                    serialization.Encoding.PEM,
                    serialization.PrivateFormat.TraditionalOpenSSL,
                    serialization.NoEncryption()
                ))
            with open(pub_path, "wb") as f:
                f.write(PUBLIC_KEY.public_bytes(
                    serialization.Encoding.PEM,
                    serialization.PublicFormat.SubjectPublicKeyInfo
                ))
            logger.info("[Evidence] New key pair saved to %s", os.path.abspath(keys_dir))
    except Exception as e:
        logger.error("[Evidence] FAILED to load/generate keys: %s", e, exc_info=True)

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
        # We now verify the Merkle root instead of single data
        canonical_data = canonicalize_data({"merkle_root": block.merkle_root, "timestamp": block.timestamp})
        
        # Optionally, verify the merkle tree itself if entries are present
        if MerkleTree:
            mt = MerkleTree(block.entries)
            if mt.root != block.merkle_root:
                tampered.append(i)
                
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

async def integrity_sentinel():
    """Background task to continuously verify chain integrity (Heartbeat)."""
    global INTEGRITY_STATUS, LAST_HEARTBEAT
    while True:
        try:
            if EVIDENCE_CHAIN:
                result = verify_chain()
                INTEGRITY_STATUS = "VALID" if result.is_valid else "COMPROMISED"
            LAST_HEARTBEAT = datetime.utcnow().isoformat()
        except Exception as e:
            logger.error(f"[Sentinel] Error: {e}")
            INTEGRITY_STATUS = "ERROR"
        await asyncio.sleep(60) # Run every 60 seconds

load_keys()

@app.on_event("startup")
async def startup_event():
    """Re-run key loading inside the uvicorn worker process.
    With --reload, the module-level load_keys() may run in the reloader
    parent and not carry over to the worker; this guarantees keys are set."""
    if PRIVATE_KEY is None or PUBLIC_KEY is None:
        logger.info("[Evidence] Startup event: keys not set, calling load_keys() ...")
        load_keys()
    
    # Start the Integrity Sentinel background task
    asyncio.create_task(integrity_sentinel())
    
    logger.info("[Evidence] Startup complete — keys_loaded=%s  chain_blocks=%d",
                PRIVATE_KEY is not None, len(EVIDENCE_CHAIN))

# API endpoints
@app.get("/", response_model=HealthResponse)
async def root():
    return {"status": "healthy", "keys_loaded": PRIVATE_KEY is not None and PUBLIC_KEY is not None,
            "chain_blocks": len(EVIDENCE_CHAIN), "api_version": "1.0.0"}

class BatchPreserveRequest(BaseModel):
    entries: List[EvidenceEntry]

@app.post("/preserve", response_model=PreservationResponse)
async def preserve_evidence(entry: EvidenceEntry):
    return await preserve_batch(BatchPreserveRequest(entries=[entry]))

@app.post("/preserve/batch", response_model=PreservationResponse)
async def preserve_batch(request: BatchPreserveRequest):
    if not PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="Signing key not available")
    
    entries_dicts = [e.dict() for e in request.entries]
    
    if MerkleTree:
        mt = MerkleTree(entries_dicts)
        merkle_root = mt.root
    else:
        merkle_root = "0" * 64
    
    previous_hash = EVIDENCE_CHAIN[-1].current_hash if EVIDENCE_CHAIN else "0" * 64
    timestamp = datetime.utcnow().isoformat()
    
    # Hash the merkle root + timestamp as canonical data for the block hash
    canonical_data = canonicalize_data({"merkle_root": merkle_root, "timestamp": timestamp})
    current_hash = calculate_hash(canonical_data, previous_hash)
    signature = sign_hash(current_hash)
    
    # ML Analysis
    ml_insights = None
    if evidence_analyzer:
        ml_insights = evidence_analyzer.analyze(entries_dicts)
    
    block = EvidenceBlock(
        block_index=len(EVIDENCE_CHAIN), timestamp=timestamp,
        entries=entries_dicts, merkle_root=merkle_root,
        current_hash=current_hash, previous_hash=previous_hash, signature=signature,
        ml_insights=ml_insights
    )
    EVIDENCE_CHAIN.append(block)
    
    return PreservationResponse(status="preserved", block_index=block.block_index, merkle_root=merkle_root, hash=current_hash,
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
    return ChainStats(
        total_blocks=len(EVIDENCE_CHAIN), first_block_time=EVIDENCE_CHAIN[0].timestamp,
        last_block_time=EVIDENCE_CHAIN[-1].timestamp, chain_hash=EVIDENCE_CHAIN[-1].current_hash,
        integrity_status=INTEGRITY_STATUS
    )

@app.get("/sample-data/log", response_model=EvidenceEntry)
async def get_sample_log():
    return EvidenceEntry(log_id="sample_001", timestamp=datetime.utcnow().isoformat(),
                        event_type="UserLogin", user_id="test.user@company.com",
                        action="Authenticated via SSO", metadata={"ip": "192.168.1.50", "device": "MacBook Pro"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
