import asyncio
from src.main import analyze_logs, LogEntry

async def test():
    logs = [
        LogEntry(log_id="1", timestamp="2026-05-04T12:00:00Z", ip_address="1.1.1.1", method="GET", url="/index.html", status_code=200),
        LogEntry(log_id="2", timestamp="2026-05-04T12:01:00Z", ip_address="1.1.1.1", method="GET", url="/style.css", status_code=200),
        LogEntry(log_id="3", timestamp="2026-05-04T12:02:00Z", ip_address="2.2.2.2", method="POST", url="/login.php?user=admin' OR '1'='1", status_code=500),
        LogEntry(log_id="4", timestamp="2026-05-04T12:03:00Z", ip_address="2.2.2.2", method="GET", url="/../../etc/passwd", status_code=403),
    ]
    res = await analyze_logs(logs)
    print(f"Total Clusters: {res.num_clusters}")
    print(f"Anomalies Detected: {res.noise_count}")
    print(f"Report Length: {len(res.report)}")
    print(f"Report Preview: {res.report[:100]}...")

asyncio.run(test())
