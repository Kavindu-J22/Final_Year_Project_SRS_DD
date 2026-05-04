import asyncio
from api import correlate_events, CorrelationRequest, LogEvent

async def test():
    events = [
        LogEvent(event_id="e1", timestamp="2026-05-04T12:00:00Z", event_type="FailedLogin", user_id="user1", source_ip="10.0.0.1"),
        LogEvent(event_id="e2", timestamp="2026-05-04T12:01:00Z", event_type="FailedLogin", user_id="user1", source_ip="10.0.0.1"),
        LogEvent(event_id="e3", timestamp="2026-05-04T12:02:00Z", event_type="FailedLogin", user_id="user1", source_ip="10.0.0.1"),
        LogEvent(event_id="e4", timestamp="2026-05-04T12:03:00Z", event_type="FailedLogin", user_id="user1", source_ip="10.0.0.1"),
        LogEvent(event_id="e5", timestamp="2026-05-04T12:04:00Z", event_type="FailedLogin", user_id="user1", source_ip="10.0.0.1"),
        LogEvent(event_id="e6", timestamp="2026-05-04T12:05:00Z", event_type="ConsoleLogin", user_id="user1", source_ip="10.0.0.1"),
        LogEvent(event_id="e7", timestamp="2026-05-04T12:06:00Z", event_type="CreateAccessKey", user_id="user1", source_ip="10.0.0.1"),
    ]
    req = CorrelationRequest(events=events, time_window_minutes=30)
    res = await correlate_events(req)
    for r in res:
        print(f"[{r.severity}] {r.title} - Stage: {r.kill_chain_stage}")
        print(f"Progress: {r.kill_chain_progress}")

asyncio.run(test())
