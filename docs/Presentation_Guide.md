# Research Panel Presentation Guide
## Cloud Forensics Investigation Platform — Final Year Group Project

> **Team Members:** IT22920836 · IT22033550 · IT22581402 · IT22916808
> **Presentation Duration:** ~30 minutes  |  **Demo Environment:** localhost

---

## Pre-Presentation Checklist (do this 10 minutes before)

```
[ ] All 6 terminals open and services running (see System_Overview.md §7)
[ ] Browser open at http://localhost:3000  — logged in as analyst
[ ] Dashboard loads with ML Service Health cards showing ALL ONLINE (4 × green)
[ ] smoke_test.py has been run at least once OR System Test page shows last pass
[ ] MongoDB running (check: mongosh --eval "db.runCommand({ping:1})")
[ ] Projector / screen share ready — browser zoom at 90 %
```

---

## Presentation Script (30 minutes)

### PART 1 — System Overview (5 min)  `[All members present together]`

**Talking points:**
- "We built a cloud forensics platform that replicates how a real SOC investigates a cloud breach."
- Show the **Dashboard** (`/dashboard`).
  - Point to the **Service Health** panel — 4 green cards = all ML services live.
  - Point to KPI cards: Total Logs · Active Incidents · Evidence Blocks · Risk Score.
- "The platform is composed of 4 independent ML microservices, each built by a separate team member,
  all orchestrated through a Node.js backend and visualised in this Next.js dashboard."

---

### PART 2 — Component 1: Identity Attribution & Behavior Profiling (6 min)  `[IT22920836]`

**Navigate to:** Sidebar → **Identity Log** (`/history`)

**Demo steps:**
1. Open the browser tab `http://localhost:8001/docs` to show the live Swagger UI.
2. Click **POST /analyze** → **Try it out** → paste the anomalous payload:
   ```json
   { "user_id": "hacker@test.com", "hour_of_day": 3, "duration_sec": 1800,
     "event_count": 250, "distinct_ips": 5, "file_access_ratio": 0.95,
     "is_weekend": 0, "geographic_location": "Russia" }
   ```
3. Execute → show `"is_anomaly": true`, `"risk_level": "HIGH"`, model votes, contributing factors.
4. Switch back to the main app `/history` — the new entry appears in the table.

**Key talking points:**
- "Three independent ML models vote — Isolation Forest, One-Class SVM, and an Autoencoder."
- "A majority vote (≥ 2/3) determines the final verdict — this ensemble design reduces false positives."
- "The model flags off-hours access, unusual geographic location, and high file-access ratio."

---

### PART 3 — Component 2: Incident Detection & Correlation (6 min)  `[IT22033550]`

**Navigate to:** Sidebar → **Incidents** (`/incidents`), then **Detection Rules** (`/rules`)

**Demo steps:**
1. Show the **Rules page** — list of MITRE ATT&CK rules loaded from `rulebase.yaml`.
2. Open `http://localhost:8002/docs` → **POST /correlate** → **Try it out** → use the sample:
   ```json
   { "events": [], "time_window_minutes": 5 }
   ```
   Then click **GET /sample-data/brute-force** to get 10 FailedLogin events and re-run `/correlate`.
3. Show the generated `IncidentAlert` — highlight `mitre_technique`, `severity: HIGH`, `recommendations`.
4. Navigate back to `/incidents` in the main app — the alert appears in the list.

**Key talking points:**
- "The engine correlates events across a configurable time window — not just individual events."
- "Every alert is mapped to a MITRE ATT&CK technique ID, giving forensic analysts immediate context."
- "The Rule Store (`/store`) lets analysts import new detection rules without restarting the service."

---

### PART 4 — Component 3: Evidence Preservation & Chain of Custody (6 min)  `[IT22581402]`

**Navigate to:** Sidebar → **Forensics** (`/forensics`)

**Demo steps:**
1. Open `http://localhost:8003/docs` → **POST /preserve** → **Try it out** → paste:
   ```json
   { "log_id": "critical_finding_001", "timestamp": "2026-03-23T09:00:00Z",
     "event_type": "DataExfiltration", "user_id": "attacker@evil.com",
     "action": "Downloaded 500 MB from /confidential", "metadata": {"ip": "10.0.0.99"} }
   ```
2. Show the response — `block_index`, `hash` (64 hex chars), `signature` (RSA-2048).
3. Call **POST /verify** → show `"is_valid": true`, `"tampered_blocks": []`.
4. **Tamper demo (optional):** Manually change one character in the chain via `/chain`, re-run `/verify` → show `"is_valid": false` and the tampered block index.

**Key talking points:**
- "Each block is SHA-256 hashed AND RSA-2048 signed — two independent layers of integrity protection."
- "The chain links every block to the previous one — altering any block breaks the entire chain."
- "This meets the legal standard of Chain of Custody — evidence is admissible in court proceedings."

---

### PART 5 — Component 4: Forensic Timeline Reconstruction (6 min)  `[IT22916808]`

**Navigate to:** Sidebar → **Log Viewer** (`/logs`), then **Timeline** (`/timeline`)

**Demo steps:**
1. Open `http://localhost:8004/docs` → **GET /sample-data/attack** to show 3 attack log entries.
2. **POST /analyze** → paste the attack sample JSON → Execute.
3. Show the response: cluster `-1` labelled **"Anomalies"**, SQL injection and path traversal detected.
4. **GET /anomalies** → show `AnomalyDetail` list with `reason`, `suspicious_pattern`, `severity`.
5. **GET /search/{entity}?field=ip_address** using the attacker IP → timeline of all events from that IP.
6. Navigate to `/logs` in the main app — clusters displayed; anomalous entries highlighted.

**Key talking points:**
- "DBSCAN-inspired clustering automatically groups logs without labelled training data — purely unsupervised."
- "The system detects SQL injection, path traversal, and command injection in real-time from raw URL patterns."
- "The entity search reconstructs the attacker's full activity timeline from a single IP or user ID."

---

### PART 6 — Live System Test (3 min)  `[All members]`

**Navigate to:** Sidebar → **System Tests** (`/system-test`)

**Demo steps:**
1. Click **Run Full Smoke Test**.
2. Watch the 4 component cards update in real-time with PASS/FAIL per test case.
3. Once complete, point to the green banner: *"All systems operational — all tests passed!"*
4. Highlight each card: test name, result, duration in milliseconds.

**Key talking points:**
- "This page fires live test payloads at all 4 ML services simultaneously and reports results instantly."
- "Each component runs 4 test cases — health check, core ML endpoint, edge case, and error handling."
- "This is the same approach used in production CI/CD pipelines — automated regression testing."

---

### PART 7 — Q&A Preparation (2 min buffer)

**Likely panel questions and suggested answers:**

| Question | Suggested Answer |
|----------|-----------------|
| Why use an ensemble for identity profiling? | Single models have high false-positive rates on anomaly detection. Ensemble voting (majority rule) balances recall and precision across three different algorithmic families. |
| How is DBSCAN different from K-Means? | K-Means requires specifying K clusters upfront and forces every point into a cluster. DBSCAN discovers clusters organically and labels outliers as noise (cluster -1) — ideal for forensics where attack patterns are rare and unpredictable. |
| What happens if an ML service goes offline? | The backend uses `Promise.allSettled()` so a single service failure doesn't crash the system. The dashboard shows the affected service as OFFLINE and continues operating on the remaining three. |
| Is the evidence chain truly tamper-evident? | Yes — each block stores a SHA-256 hash of its own content plus the previous hash. Any modification invalidates all subsequent hashes AND the RSA signature, which are verified independently. |
| How does the system scale? | Each ML service is independently deployable. They can be containerised (Docker) and orchestrated with Kubernetes. The stateless FastAPI services scale horizontally behind a load balancer. |

---

## Document Index

| File | Description |
|------|-------------|
| `docs/Component1_Identity_Profiling.md` | Technical deep-dive: IT22920836 |
| `docs/Component2_Incident_Detection.md` | Technical deep-dive: IT22033550 |
| `docs/Component3_Evidence_Preservation.md` | Technical deep-dive: IT22581402 |
| `docs/Component4_Forensic_Timeline.md` | Technical deep-dive: IT22916808 |
| `docs/System_Overview.md` | End-to-end architecture & integration |
| `docs/Presentation_Guide.md` | This file — step-by-step demo guide |

