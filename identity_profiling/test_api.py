import asyncio
from api import analyze, SessionData, startup_event

async def test():
    await startup_event()
    data = SessionData(user_id='test', hour_of_day=10, duration_sec=3600, event_count=500, distinct_ips=4, file_access_ratio=0.8, is_weekend=0, geographic_location='Russia')
    res = await analyze(data)
    print(res.dict())

asyncio.run(test())
