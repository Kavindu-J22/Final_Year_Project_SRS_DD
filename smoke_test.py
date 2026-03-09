"""
Smoke test for all 4 ML services.
Run: python smoke_test.py
"""
import urllib.request
import json

def get(url):
    try:
        with urllib.request.urlopen(url, timeout=8) as r:
            return r.status, json.loads(r.read())
    except Exception as e:
        return 0, str(e)

def post(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, str(e)

def section(title):
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)

def ok(msg):  print(f"  [OK]  {msg}")
def fail(msg): print(f"  [!!]  {msg}")

# ─── Service 1 : identity_profiling ───────────────────────────
section("PORT 8001 — identity_profiling")

s, r = get("http://localhost:8001/")
ok(f"GET /  -> HTTP {s}  models_loaded={r.get('models_loaded')}") if s == 200 else fail(f"GET /  -> {s}: {r}")

s, r = get("http://localhost:8001/models/status")
if s == 200:
    for m in r:
        ok(f"  model={m['model_type']}  loaded={m['loaded']}  acc={m.get('accuracy')}")
else:
    fail(f"GET /models/status -> {s}: {r}")

s, r = post("http://localhost:8001/analyze", {
    "user_id": "suspicious@test.com",
    "hour_of_day": 3, "duration_sec": 1800, "event_count": 250,
    "distinct_ips": 1, "file_access_ratio": 0.95,
    "is_weekend": 0, "geographic_location": "Russia"
})
if s == 200:
    ok(f"POST /analyze -> is_anomaly={r['is_anomaly']}  risk={r['risk_level']}  score={r['anomaly_score']}")
    ok(f"  model_votes={r['model_votes']}")
elif s == 503:
    fail(f"POST /analyze -> 503: {r} (no .pkl models loaded)")
else:
    fail(f"POST /analyze -> {s}: {r}")

# ─── Service 2 : incident_detection ───────────────────────────
section("PORT 8002 — incident_detection")

s, r = get("http://localhost:8002/")
ok(f"GET /  -> HTTP {s}  rules_loaded={r.get('rules_loaded')}") if s == 200 else fail(f"GET /  -> {s}: {r}")

s, r = get("http://localhost:8002/rules")
ok(f"GET /rules -> HTTP {s}  ({len(r)} rules returned)") if s == 200 else fail(f"GET /rules -> {s}: {r}")

events = [
    {"event_id": f"evt_{i:05d}", "timestamp": f"2026-01-05T03:45:{i:02d}Z",
     "event_type": "FailedLogin", "user_id": "admin@company.com",
     "source_ip": "203.0.113.42", "resource": "/api/v1/login",
     "metadata": {"attempt": i}}
    for i in range(1, 8)
]
s, r = post("http://localhost:8002/correlate", {"events": events, "time_window_minutes": 10})
if s == 200:
    ok(f"POST /correlate -> HTTP {s}  {len(r)} incident(s) detected")
    if r:
        ok(f"  severity={r[0]['severity']}  title={r[0]['title']!r}")
else:
    fail(f"POST /correlate -> {s}: {r}")

# ─── Service 3 : evidence_preservation ────────────────────────
section("PORT 8003 — evidence_preservation")

s, r = get("http://localhost:8003/")
ok(f"GET /  -> HTTP {s}  keys_loaded={r.get('keys_loaded')}  chain_blocks={r.get('chain_blocks')}") if s == 200 else fail(f"GET /  -> {s}: {r}")

s, r = post("http://localhost:8003/preserve", {
    "log_id": "smoke_001", "timestamp": "2026-01-05T02:00:00Z",
    "event_type": "UserLogin", "user_id": "test.user@company.com",
    "action": "Authenticated via SSO", "metadata": {"ip": "10.0.0.1"}
})
if s == 200:
    ok(f"POST /preserve -> HTTP {s}  block={r['block_index']}  status={r['status']}")
    ok(f"  hash={r['hash'][:20]}...")
else:
    fail(f"POST /preserve -> {s}: {r}")

s, r = post("http://localhost:8003/verify", {})
ok(f"POST /verify -> HTTP {s}  is_valid={r.get('is_valid')}  blocks={r.get('total_blocks')}") if s == 200 else fail(f"POST /verify -> {s}: {r}")

s, r = get("http://localhost:8003/stats")
ok(f"GET /stats -> HTTP {s}  integrity={r.get('integrity_status')}") if s == 200 else fail(f"GET /stats -> {s}: {r}")

# ─── Service 4 : forensic_timeline ────────────────────────────
section("PORT 8004 — forensic_timeline")

s, r = get("http://localhost:8004/")
ok(f"GET /  -> HTTP {s}  api_version={r.get('api_version')}") if s == 200 else fail(f"GET /  -> {s}: {r}")

logs = [
    {"log_id": "attack_sql", "timestamp": "2026-01-05T03:45:12Z", "ip_address": "203.0.113.42",
     "method": "POST", "url": "/admin.php?id=1 OR 1=1", "status_code": 500, "user_agent": "sqlmap/1.0"},
    {"log_id": "attack_traversal", "timestamp": "2026-01-05T03:45:15Z", "ip_address": "203.0.113.42",
     "method": "GET", "url": "/../../etc/passwd", "status_code": 403, "user_agent": "curl/7.68.0"},
    {"log_id": "norm_1", "timestamp": "2026-01-05T14:00:00Z", "ip_address": "192.168.1.50",
     "method": "GET", "url": "/index.html", "status_code": 200, "user_agent": "Mozilla/5.0"},
    {"log_id": "norm_2", "timestamp": "2026-01-05T14:01:00Z", "ip_address": "192.168.1.50",
     "method": "GET", "url": "/style.css", "status_code": 200, "user_agent": "Mozilla/5.0"},
    {"log_id": "api_1", "timestamp": "2026-01-05T14:02:00Z", "ip_address": "10.0.0.5",
     "method": "GET", "url": "/api/v1/users", "status_code": 200, "user_agent": "MyApp/1.0"},
]
s, r = post("http://localhost:8004/analyze", logs)
if s == 200:
    ok(f"POST /analyze -> HTTP {s}  total_logs={r['total_logs']}  clusters={r['num_clusters']}  noise={r['noise_count']}")
    ok(f"  processing_time={r['processing_time_ms']}ms")
    for c in r["clusters"]:
        ok(f"  cluster {c['cluster_id']} ({c['label']}): {c['size']} logs  anomaly={c['is_anomaly']}")
else:
    fail(f"POST /analyze -> {s}: {r}")

s, r = get("http://localhost:8004/anomalies")
ok(f"GET /anomalies -> HTTP {s}  {len(r)} anomalies detected") if s == 200 else fail(f"GET /anomalies -> {s}: {r}")
if s == 200 and r:
    for a in r:
        ok(f"  [{a['severity']}] {a['log_id']}: {a['reason']}")

print()
print("=" * 60)
print("  ALL TESTS COMPLETE")
print("=" * 60)
print()

