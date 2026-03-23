# Cloud Forensics Platform — Overall System Technical Document

---

## 1. Project Summary
A **final-year group research project** that delivers a fully integrated cloud-forensics investigation platform. Four independently developed ML microservices work in concert to:
1. Profile user behaviour and flag insider threats (Component 1)
2. Detect and correlate security incidents against MITRE ATT&CK (Component 2)
3. Preserve digital evidence in a cryptographically tamper-evident chain (Component 3)
4. Reconstruct forensic attack timelines via unsupervised log clustering (Component 4)

All four services are orchestrated by a Node.js/Express REST backend and presented through a Next.js React dashboard.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Next.js Frontend (port 3000)              │
│  Dashboard · Log Viewer · Incidents · Forensics · Timeline      │
│  Identity Log · Rules · Rule Store · System Test Runner          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ /api/* (JWT-authenticated)
┌──────────────────────────▼──────────────────────────────────────┐
│              Node.js / Express Backend (port 5000)               │
│  auth · logs · incidents · forensics · dashboard · system       │
│                 MongoDB (Mongoose ODM)                           │
└───┬──────────────┬──────────────┬──────────────┬───────────────┘
    │              │              │              │
    ▼ :8001        ▼ :8002        ▼ :8003        ▼ :8004
┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│ C1     │  │ C2       │  │ C3       │  │ C4           │
│Identity│  │Incident  │  │Evidence  │  │Timeline      │
│Profil- │  │Detection │  │Preserv-  │  │Reconstruct-  │
│ing     │  │& Correl. │  │ation     │  │ion           │
│FastAPI │  │FastAPI   │  │FastAPI   │  │FastAPI       │
└────────┘  └──────────┘  └──────────┘  └──────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| ML Services (×4) | Python 3.10+, FastAPI, Uvicorn | ML inference & domain logic |
| ML Libraries | scikit-learn, numpy, pandas | Model training & inference |
| Cryptography | `cryptography` library (RSA, SHA-256) | Evidence signing & verification |
| Backend API | Node.js 18+, Express 4, Axios | REST orchestration & persistence |
| Database | MongoDB (via Mongoose) | Persistent storage of logs, incidents, blocks |
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS | Dashboard UI |
| Auth | JWT (jsonwebtoken), bcrypt | Secure session management |
| HTTP Security | Helmet, CORS | Defence-in-depth headers |

---

## 4. Data Flow: End-to-End Log Investigation

```
1. Analyst uploads raw logs  → POST /api/logs/ingest (per event)
                               or POST /api/logs/analyze (batch)
                                      │
2. Incident Detection (C2)  ← incidentService.ingestEvent()   [ real-time ]
   → alerts saved to MongoDB Incident collection
                                      │
3. Timeline Clustering (C4) ← timelineService.analyzeLogs()   [ batch ]
   → ClusterResult saved to MongoDB
   → anomalous log entries flagged in LogEntry collection
                                      │
4. Evidence Preservation (C3) ← POST /api/forensics/preserve  [ per finding ]
   → EvidenceBlock added to cryptographic chain
   → Block mirrored to MongoDB ForensicBlock collection
                                      │
5. Identity Profiling (C1)  ← POST /api/forensics/identity/analyze [ per user ]
   → Risk score + contributing factors returned
   → History persisted in identity_profiling/data/history.json
                                      │
6. Dashboard aggregates all  ← GET /api/dashboard/stats + /recent + /ml-health
   → Real-time KPI cards, charts, recent incidents, ML health status
```

---

## 5. MongoDB Collections

| Collection | Model File | Description |
|------------|------------|-------------|
| `logentries` | `LogEntry.js` | Raw ingested log events with anomaly flags |
| `incidents` | `Incident.js` | Correlated security incident alerts |
| `forensicblocks` | `ForensicBlock.js` | Mirror of evidence chain blocks |
| `clusterresults` | `ClusterResult.js` | DBSCAN analysis results |
| `users` | `User.js` | Registered analyst accounts (hashed passwords) |

---

## 6. Authentication & Security
- JWT-based authentication; token stored in `localStorage` as `cf_token`
- All `/api/*` routes except `/api/auth/*` require a valid Bearer token
- 401 responses automatically redirect the React client to `/login`
- RSA-2048 key pair at `keys/` provides cryptographic non-repudiation for evidence blocks
- `helmet()` sets security headers; CORS restricted to `CLIENT_URL`

---

## 7. Service Startup Order (Recommended)
```powershell
# Terminal 1 – Component 1
cd identity_profiling && .\.venv\Scripts\uvicorn api:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 – Component 2
cd incident_detection && .\.venv\Scripts\uvicorn api:app --host 0.0.0.0 --port 8002 --reload

# Terminal 3 – Component 3
cd evidence_preservation && .\.venv\Scripts\uvicorn api:app --host 0.0.0.0 --port 8003 --reload

# Terminal 4 – Component 4
cd forensic_timeline && .\.venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8004 --reload

# Terminal 5 – Node.js Backend
cd backend && npm start          # http://localhost:5000

# Terminal 6 – Next.js Frontend
cd frontend && npm run dev       # http://localhost:3000
```

---

## 8. System Test / Smoke Test
**CLI:**
```powershell
python smoke_test.py
```
**In-App:** Navigate to **System Tests** in the sidebar → click **Run Full Smoke Test**.  
The test runner fires live payloads at all 4 ML services and displays pass/fail per test case in a component-by-component card view.

---

## 9. API Reference Summary

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Login, register, get current user |
| `/api/logs` | Ingest, list and cluster-analyse log entries |
| `/api/incidents` | List, correlate, manage incidents and MITRE rules |
| `/api/forensics` | Evidence chain, identity profiling, timeline analysis |
| `/api/dashboard` | KPI stats, ML health, recent activity |
| `/api/system` | Smoke-test runner (calls all 4 ML services) |

---

## 10. Environment Variables (backend/.env)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/cloudforensics
JWT_SECRET=<long-random-string>
CLIENT_URL=http://localhost:3000
ML_IDENTITY_URL=http://localhost:8001
ML_INCIDENT_URL=http://localhost:8002
ML_EVIDENCE_URL=http://localhost:8003
ML_TIMELINE_URL=http://localhost:8004
```

