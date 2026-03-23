# Component 3 — Evidence Preservation & Chain of Custody
**Student:** IT22581402  |  **Service Port:** 8003  |  **API Base:** `http://localhost:8003`

---

## 1. Overview
Component 3 implements a **cryptographically tamper-evident evidence ledger** for cloud forensics. Every digital evidence entry is hashed with SHA-256 and chained to the previous block — identical in concept to a blockchain. Each block is additionally signed with an RSA-2048 private key, providing **non-repudiation** and making the evidence admissible in court proceedings.

---

## 2. Cryptographic Architecture

```
Evidence Entry
      │
      ▼
SHA-256(canonical_JSON + previous_hash)  ──► current_hash
      │
      ▼
RSA-2048 Sign(current_hash, private_key) ──► signature
      │
      ▼
EvidenceBlock { index, timestamp, data, current_hash, previous_hash, signature }
      │
      ▼ appended to ──► EVIDENCE_CHAIN [ block_0, block_1, … block_N ]
```

**Genesis block** uses `previous_hash = "0" * 64`.  
**Chain verification** recomputes every hash and re-verifies every RSA signature independently.

---

## 3. Cryptographic Primitives

| Component | Algorithm | Key Size |
|-----------|-----------|----------|
| Data fingerprinting | SHA-256 | 256-bit |
| Block signing | RSA with PKCS#1 v1.5 padding | 2048-bit |
| Signature verification | RSA public key verify | 2048-bit |
| Data canonicalization | `json.dumps(sort_keys=True)` | — |

Key files are loaded from `../keys/private_key.pem` and `../keys/public_key.pem`.

---

## 4. Data Models

### EvidenceEntry (input to `/preserve`)
```json
{
  "log_id": "log_12345",
  "timestamp": "2026-01-05T02:00:00Z",
  "event_type": "UserLogin",
  "user_id": "admin@example.com",
  "action": "Accessed /admin/users",
  "metadata": { "ip": "192.168.1.50", "device": "MacBook Pro" }
}
```

### EvidenceBlock (stored in chain)
```json
{
  "block_index": 0,
  "timestamp": "2026-01-05T02:00:01.123456",
  "data": { /* original EvidenceEntry dict */ },
  "current_hash":  "a3f2...64 hex chars",
  "previous_hash": "0000...64 hex chars",
  "signature":     "deadbeef...RSA hex"
}
```

### PreservationResponse (returned to caller)
```json
{
  "status": "preserved",
  "block_index": 0,
  "hash": "a3f2c...",
  "signature": "deadbeef...",
  "message": "Evidence block 0 added to chain"
}
```

---

## 5. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health — `keys_loaded`, `chain_blocks`, `api_version` |
| POST | `/preserve` | Hash, sign and append an evidence entry to the chain |
| POST | `/verify` | Full chain integrity check (hash + signature for every block) |
| GET | `/chain?limit=N` | Retrieve last N blocks |
| GET | `/block/{index}` | Get a specific block by index |
| GET | `/stats` | Chain statistics: total blocks, timestamps, integrity status |
| GET | `/sample-data/log` | Pre-built evidence entry sample |

### POST `/verify` — Response
```json
{
  "is_valid": true,
  "total_blocks": 12,
  "blocks_verified": 12,
  "tampered_blocks": [],
  "broken_links": [],
  "verification_time_ms": 3.21,
  "message": "Chain is valid"
}
```

---

## 6. File Structure
```
evidence_preservation/
├── api.py              # FastAPI application
├── verify_chain.py     # Standalone chain verification CLI script
├── src/                # Additional utility modules
├── test_data/          # Sample evidence payloads
└── integration_test.py # Integration tests
```
**Shared keys** (root-level):
```
keys/
├── private_key.pem     # RSA-2048 private key (signing)
└── public_key.pem      # RSA-2048 public key (verification)
```

---

## 7. Chain Integrity Verification Logic
```python
for i, block in enumerate(EVIDENCE_CHAIN):
    canonical = json.dumps(block.data, sort_keys=True)
    prev_hash = EVIDENCE_CHAIN[i-1].current_hash if i > 0 else "0"*64
    expected  = sha256(canonical + prev_hash)
    if expected != block.current_hash:      → tampered_blocks.append(i)
    if not rsa_verify(block.signature):     → tampered_blocks.append(i)
    if block.previous_hash != prev_hash:    → broken_links.append(i)
```

---

## 8. Integration with Main Application
- Backend `evidenceService` in `mlService.js` proxies all evidence operations
- `POST /api/forensics/preserve` → calls `evidenceService.preserveEvidence()` and mirrors the block to MongoDB `ForensicBlock` collection (fallback if ML service goes offline)
- `POST /api/forensics/verify` → live chain integrity check
- Dashboard stat card shows live `integrity_status` pulled from `/stats`
- Forensics page `/forensics` displays the full evidence chain and digital notary info

---

## 9. How to Start
```powershell
cd evidence_preservation
.\.venv\Scripts\uvicorn api:app --host 0.0.0.0 --port 8003 --reload
# Swagger UI: http://localhost:8003/docs
```

