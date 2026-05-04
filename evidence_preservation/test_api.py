import asyncio
from api import preserve_batch, BatchPreserveRequest, EvidenceEntry, EVIDENCE_CHAIN, startup_event, verify_chain

async def test():
    await startup_event()
    
    entries = [
        EvidenceEntry(log_id="e1", timestamp="2026-05-04T12:00:00Z", event_type="FailedLogin", user_id="user1", action="test"),
        EvidenceEntry(log_id="e2", timestamp="2026-05-04T12:01:00Z", event_type="FailedLogin", user_id="user1", action="test")
    ]
    req = BatchPreserveRequest(entries=entries)
    
    res = await preserve_batch(req)
    print(f"Preserved Block: {res.block_index}")
    print(f"Merkle Root: {res.merkle_root}")
    print(f"Hash: {res.hash}")
    
    ver = verify_chain()
    print(f"Chain Valid: {ver.is_valid}")
    print(f"Total Blocks: {ver.total_blocks}")

asyncio.run(test())
