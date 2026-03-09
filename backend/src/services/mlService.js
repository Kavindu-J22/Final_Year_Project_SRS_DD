/**
 * mlService.js – Axios bridge to all four FastAPI ML microservices.
 *
 *  Component 1 – Identity Attribution & Behavior Profiling  → port 8001
 *  Component 2 – Incident Detection & Correlation Engine    → port 8002
 *  Component 3 – Evidence Preservation (Digital Notary)     → port 8003
 *  Component 4 – Forensic Timeline Reconstruction (DBSCAN)  → port 8004
 */
const axios = require('axios');

const ML = {
  identity: process.env.ML_IDENTITY_URL || 'http://localhost:8001',
  incident: process.env.ML_INCIDENT_URL || 'http://localhost:8002',
  evidence: process.env.ML_EVIDENCE_URL || 'http://localhost:8003',
  timeline: process.env.ML_TIMELINE_URL || 'http://localhost:8004',
};

/** Create a pre-configured axios instance for a given base URL */
const client = (baseURL) =>
  axios.create({ baseURL, timeout: 30_000, headers: { 'Content-Type': 'application/json' } });

// ── Component 1: Identity Attribution & Behavior Profiling ───────────────────
const identityService = {
  analyzeSession:  (payload) => client(ML.identity).post('/analyze',       payload).then((r) => r.data),
  getModelStatus:  ()        => client(ML.identity).get('/models/status'          ).then((r) => r.data),
  healthCheck:     ()        => client(ML.identity).get('/'                       ).then((r) => r.data),
};

// ── Component 2: Incident Detection & Correlation Engine ────────────────────
const incidentService = {
  ingestEvent:     (event)                   => client(ML.incident).post('/ingest',    event).then((r) => r.data),
  correlateEvents: (events, windowMins = 30) =>
    client(ML.incident).post('/correlate', { events, time_window_minutes: windowMins }).then((r) => r.data),
  getIncidents:    (limit = 20)              => client(ML.incident).get(`/incidents?limit=${limit}`).then((r) => r.data),
  getRules:        ()                        => client(ML.incident).get('/rules'                   ).then((r) => r.data),
  healthCheck:     ()                        => client(ML.incident).get('/'                        ).then((r) => r.data),
};

// ── Component 3: Evidence Preservation / Digital Notary ─────────────────────
const evidenceService = {
  preserveEvidence: (entry)       => client(ML.evidence).post('/preserve'         , entry).then((r) => r.data),
  verifyChain:      ()            => client(ML.evidence).post('/verify'                  ).then((r) => r.data),
  getChain:         (limit = 100) => client(ML.evidence).get(`/chain?limit=${limit}`     ).then((r) => r.data),
  getBlock:         (index)       => client(ML.evidence).get(`/block/${index}`           ).then((r) => r.data),
  getChainStats:    ()            => client(ML.evidence).get('/stats'                    ).then((r) => r.data),
  healthCheck:      ()            => client(ML.evidence).get('/'                         ).then((r) => r.data),
};

// ── Component 4: Forensic Timeline Reconstruction (DBSCAN + TF-IDF) ─────────
const timelineService = {
  analyzeLogs:  (logs) => client(ML.timeline).post('/analyze',  logs).then((r) => r.data),
  getClusters:  ()     => client(ML.timeline).get('/clusters'       ).then((r) => r.data),
  getAnomalies: ()     => client(ML.timeline).get('/anomalies'      ).then((r) => r.data),
  healthCheck:  ()     => client(ML.timeline).get('/'               ).then((r) => r.data),
};

// ── Aggregate health check for all 4 services ────────────────────────────────
const checkAllServices = async () => {
  const svcs = [
    { key: 'identity_profiling',  fn: identityService.healthCheck,  port: 8001 },
    { key: 'incident_detection',  fn: incidentService.healthCheck,  port: 8002 },
    { key: 'evidence_preservation',fn: evidenceService.healthCheck, port: 8003 },
    { key: 'forensic_timeline',   fn: timelineService.healthCheck,  port: 8004 },
  ];

  const results = {};
  await Promise.allSettled(
    svcs.map(async ({ key, fn, port }) => {
      try {
        const detail = await fn();
        results[key] = { status: 'online', port, detail };
      } catch (err) {
        results[key] = { status: 'offline', port, error: err.message };
      }
    })
  );
  return results;
};

module.exports = { identityService, incidentService, evidenceService, timelineService, checkAllServices };

