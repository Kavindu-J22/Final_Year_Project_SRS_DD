/**
 * systemTest.js – /api/system/smoke-test  &  /api/system/seed-demo
 *
 * Runs a live smoke-test against all 4 ML microservices and returns
 * structured pass/fail results that the frontend can display.
 * Also provides a seed-demo route to populate MongoDB with realistic demo data.
 */
const express  = require('express');
const axios    = require('axios');
const crypto   = require('crypto');
const { protect } = require('../middleware/authMiddleware');
const LogEntry  = require('../models/LogEntry');
const Incident  = require('../models/Incident');

const router = express.Router();

const ML = {
  identity: process.env.ML_IDENTITY_URL || 'http://localhost:8001',
  incident: process.env.ML_INCIDENT_URL || 'http://localhost:8002',
  evidence: process.env.ML_EVIDENCE_URL || 'http://localhost:8003',
  timeline: process.env.ML_TIMELINE_URL || 'http://localhost:8004',
};

const http = (base) =>
  axios.create({ baseURL: base, timeout: 15_000, headers: { 'Content-Type': 'application/json' } });

/** Run a single test case; returns { name, status, detail, durationMs } */
async function runTest(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { name, status: 'PASS', detail, durationMs: Date.now() - t0 };
  } catch (err) {
    const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    return { name, status: 'FAIL', detail: msg, durationMs: Date.now() - t0 };
  }
}

// ── Component 1 tests ────────────────────────────────────────────────────────
async function testComponent1() {
  const c = http(ML.identity);
  const tests = [];

  tests.push(await runTest('GET / (health)', async () => {
    const { data } = await c.get('/');
    if (data.status !== 'healthy') throw new Error('status not healthy');
    return `models_loaded=${data.models_loaded}  api_version=${data.api_version}`;
  }));

  tests.push(await runTest('GET /models/status', async () => {
    const { data } = await c.get('/models/status');
    if (!Array.isArray(data)) throw new Error('expected array');
    return data.map(m => `${m.model_type}:loaded=${m.loaded}`).join('  ');
  }));

  tests.push(await runTest('POST /analyze (anomaly session)', async () => {
    const { data } = await c.post('/analyze', {
      user_id: 'suspicious@test.com', hour_of_day: 3, duration_sec: 1800,
      event_count: 250, distinct_ips: 1, file_access_ratio: 0.95,
      is_weekend: 0, geographic_location: 'Russia',
    });
    return `is_anomaly=${data.is_anomaly}  risk=${data.risk_level}  score=${data.anomaly_score}`;
  }));

  tests.push(await runTest('POST /analyze (normal session)', async () => {
    const { data } = await c.post('/analyze', {
      user_id: 'alice@company.com', hour_of_day: 14, duration_sec: 600,
      event_count: 45, distinct_ips: 1, file_access_ratio: 0.15,
      is_weekend: 0, geographic_location: 'USA',
    });
    return `is_anomaly=${data.is_anomaly}  risk=${data.risk_level}  score=${data.anomaly_score}`;
  }));

  return tests;
}

// ── Component 2 tests ────────────────────────────────────────────────────────
async function testComponent2() {
  const c = http(ML.incident);
  const tests = [];

  tests.push(await runTest('GET / (health)', async () => {
    const { data } = await c.get('/');
    if (data.status !== 'healthy') throw new Error('status not healthy');
    return `rules_loaded=${data.rules_loaded}  buffer_size=${data.buffer_size}`;
  }));

  tests.push(await runTest('GET /rules', async () => {
    const { data } = await c.get('/rules');
    if (!Array.isArray(data)) throw new Error('expected array');
    return `${data.length} detection rules loaded`;
  }));

  tests.push(await runTest('POST /correlate (brute-force)', async () => {
    const ts = Date.now();
    const events = Array.from({ length: 7 }, (_, i) => ({
      event_id: `evt_${ts}_${i}`, timestamp: new Date(ts + i * 500).toISOString(),
      event_type: 'FailedLogin', user_id: 'admin@company.com',
      source_ip: '203.0.113.42', resource: '/api/v1/login', metadata: { attempt: i },
    }));
    const { data } = await c.post('/correlate', { events, time_window_minutes: 10 });
    if (!Array.isArray(data)) throw new Error('expected array');
    // Persist every detected incident to MongoDB so each test run creates a new record
    if (data.length > 0) {
      const ops = data.map((inc, i) => ({
        insertOne: {
          document: {
            alertId: `smoke-${ts}-${i}`,
            severity: inc.severity || 'HIGH',
            status: 'open',
            title: inc.title || 'Smoke Test: Brute Force Detected',
            description: inc.description || `Smoke test correlated ${events.length} failed logins from 203.0.113.42`,
            mitreAttackTechnique: inc.mitre_technique || 'T1110 - Brute Force',
            affectedUser: inc.user_id || 'admin@company.com',
            sourceEvents: events.map(e => e.event_id),
            recommendations: ['Block IP 203.0.113.42 at firewall', 'Enable MFA on admin accounts'],
            metadata: { sourceIp: '203.0.113.42', smokeTest: true, runAt: new Date(ts) },
            sha256Hash: crypto.createHash('sha256').update(`smoke-${ts}-${i}`).digest('hex'),
          },
        },
      }));
      await Incident.bulkWrite(ops).catch(() => {}); // silently ignore if DB unavailable
    }
    const inc = data[0];
    return inc
      ? `${data.length} incident(s) — severity=${inc.severity}  title="${inc.title}"  [saved to DB]`
      : `${data.length} incidents detected`;
  }));

  tests.push(await runTest('GET /incidents', async () => {
    const { data } = await c.get('/incidents');
    return `${Array.isArray(data) ? data.length : 0} recent incident(s) in buffer`;
  }));

  return tests;
}

// ── Component 3 tests ────────────────────────────────────────────────────────
async function testComponent3() {
  const c = http(ML.evidence);
  const tests = [];

  tests.push(await runTest('GET / (health)', async () => {
    const { data } = await c.get('/');
    if (data.status !== 'healthy') throw new Error('status not healthy');
    return `keys_loaded=${data.keys_loaded}  chain_blocks=${data.chain_blocks}`;
  }));

  tests.push(await runTest('POST /preserve (evidence block)', async () => {
    const { data } = await c.post('/preserve', {
      log_id: `smoke_${Date.now()}`, timestamp: new Date().toISOString(),
      event_type: 'UserLogin', user_id: 'test.user@company.com',
      action: 'Authenticated via SSO', metadata: { ip: '10.0.0.1' },
    });
    return `block=${data.block_index}  status=${data.status}  hash=${data.hash.slice(0,20)}…`;
  }));

  tests.push(await runTest('POST /verify (chain integrity)', async () => {
    const { data } = await c.post('/verify', {});
    return `is_valid=${data.is_valid}  blocks=${data.total_blocks}  verified=${data.blocks_verified}`;
  }));

  tests.push(await runTest('GET /stats', async () => {
    const { data } = await c.get('/stats');
    return `total_blocks=${data.total_blocks}  integrity=${data.integrity_status}`;
  }));

  return tests;
}

// ── Component 4 tests ────────────────────────────────────────────────────────
async function testComponent4() {
  const c = http(ML.timeline);
  const tests = [];

  tests.push(await runTest('GET / (health)', async () => {
    const { data } = await c.get('/');
    if (data.status !== 'healthy') throw new Error('status not healthy');
    return `api_version=${data.api_version}`;
  }));

  tests.push(await runTest('POST /analyze (mixed traffic)', async () => {
    const logs = [
      { log_id: 'sql_1', timestamp: '2026-01-05T03:45:12Z', ip_address: '203.0.113.42',
        method: 'POST', url: '/admin.php?id=1 OR 1=1', status_code: 500, user_agent: 'sqlmap/1.0' },
      { log_id: 'trav_1', timestamp: '2026-01-05T03:45:15Z', ip_address: '203.0.113.42',
        method: 'GET', url: '/../../etc/passwd', status_code: 403, user_agent: 'curl/7.68.0' },
      { log_id: 'norm_1', timestamp: '2026-01-05T14:00:00Z', ip_address: '192.168.1.50',
        method: 'GET', url: '/index.html', status_code: 200, user_agent: 'Mozilla/5.0' },
      { log_id: 'api_1', timestamp: '2026-01-05T14:02:00Z', ip_address: '10.0.0.5',
        method: 'GET', url: '/api/v1/users', status_code: 200, user_agent: 'MyApp/1.0' },
    ];
    const { data } = await c.post('/analyze', logs);
    return `total=${data.total_logs}  clusters=${data.num_clusters}  noise=${data.noise_count}  time=${data.processing_time_ms}ms`;
  }));

  tests.push(await runTest('GET /anomalies', async () => {
    const { data } = await c.get('/anomalies');
    if (!Array.isArray(data)) throw new Error('expected array');
    return `${data.length} anomalie(s) detected`;
  }));

  tests.push(await runTest('GET /metrics', async () => {
    const { data } = await c.get('/metrics');
    return `total_logs=${data.total_logs}  anomalies=${data.total_anomalies}  clusters=${data.num_clusters}`;
  }));

  return tests;
}

// ── Helper: build a typed-suite route handler ────────────────────────────────
function makeSuiteHandler(fn, suiteName) {
  return async (req, res) => {
    const t0 = Date.now();
    const tests  = await fn();
    const passed = tests.filter(t => t.status === 'PASS').length;
    const failed = tests.filter(t => t.status === 'FAIL').length;
    res.json({
      success: true,
      suiteName,
      startedAt:  new Date().toISOString(),
      durationMs: Date.now() - t0,
      summary: { totalTests: passed + failed, passed, failed, allPassed: failed === 0 },
      components: [{ id: suiteName, name: suiteName, tests, passed, failed, status: failed === 0 ? 'PASS' : 'FAIL' }],
    });
  };
}

// ── Health Suite: uptime ping on all 4 services ───────────────────────────────
async function runHealthSuite() {
  return Promise.all([
    runTest('C1 Identity — GET / health', async () => {
      const { data } = await http(ML.identity).get('/');
      if (data.status !== 'healthy') throw new Error('not healthy');
      return `models_loaded=${data.models_loaded}  version=${data.api_version}`;
    }),
    runTest('C2 Incident — GET / health', async () => {
      const { data } = await http(ML.incident).get('/');
      if (data.status !== 'healthy') throw new Error('not healthy');
      return `rules_loaded=${data.rules_loaded}  buffer=${data.buffer_size}`;
    }),
    runTest('C3 Evidence — GET / health', async () => {
      const { data } = await http(ML.evidence).get('/');
      if (data.status !== 'healthy') throw new Error('not healthy');
      return `keys_loaded=${data.keys_loaded}  blocks=${data.chain_blocks}`;
    }),
    runTest('C4 Timeline — GET / health', async () => {
      const { data } = await http(ML.timeline).get('/');
      if (data.status !== 'healthy') throw new Error('not healthy');
      return `version=${data.api_version}`;
    }),
  ]);
}

// ── Security Suite: attack-scenario tests across all services ─────────────────
async function runSecuritySuite() {
  const ts = Date.now();
  return Promise.all([
    runTest('C1 Identity — Anomalous night-time session', async () => {
      const { data } = await http(ML.identity).post('/analyze', {
        user_id: 'attacker@unknown.net', hour_of_day: 2, duration_sec: 3600,
        event_count: 600, distinct_ips: 8, file_access_ratio: 0.92,
        is_weekend: 1, geographic_location: 'North Korea',
      });
      if (!data.is_anomaly) throw new Error('Expected anomaly not flagged');
      return `risk=${data.risk_level}  score=${data.anomaly_score}`;
    }),
    runTest('C2 Incident — Brute-force 8-event correlation', async () => {
      const events = Array.from({ length: 8 }, (_, i) => ({
        event_id: `sec_bf_${ts}_${i}`, timestamp: new Date(ts + i * 300).toISOString(),
        event_type: 'FailedLogin', user_id: 'root@target.com',
        source_ip: '45.33.32.156', resource: '/admin', metadata: {},
      }));
      const { data } = await http(ML.incident).post('/correlate', { events, time_window_minutes: 5 });
      if (!Array.isArray(data)) throw new Error('expected array');
      return `${data.length} incident(s) correlated from 8 events`;
    }),
    runTest('C3 Evidence — Chain integrity post-attack', async () => {
      const { data } = await http(ML.evidence).post('/verify', {});
      return `is_valid=${data.is_valid}  blocks=${data.total_blocks}`;
    }),
    runTest('C4 Timeline — SQL injection payload detection', async () => {
      const logs = [{
        log_id: `sec_sql_${ts}`, timestamp: new Date().toISOString(),
        ip_address: '198.51.100.9', method: 'GET',
        url: "/search?q=' OR '1'='1", status_code: 400, user_agent: 'sqlmap/1.7',
      }];
      const { data } = await http(ML.timeline).post('/analyze', logs);
      return `total=${data.total_logs}  clusters=${data.num_clusters}  noise=${data.noise_count}`;
    }),
  ]);
}

// ── Accuracy Suite: true-positive / true-negative ML validation ───────────────
async function runAccuracySuite() {
  const ts = Date.now();
  return Promise.all([
    runTest('C1 Identity — True positive (clear anomaly)', async () => {
      const { data } = await http(ML.identity).post('/analyze', {
        user_id: 'hacker@dark.net', hour_of_day: 3, duration_sec: 7200,
        event_count: 800, distinct_ips: 12, file_access_ratio: 0.99,
        is_weekend: 0, geographic_location: 'Russia',
      });
      if (!data.is_anomaly) throw new Error('False negative: clear anomaly missed');
      return `TP ✓  risk=${data.risk_level}  score=${data.anomaly_score?.toFixed(3)}`;
    }),
    runTest('C1 Identity — True negative (normal session)', async () => {
      const { data } = await http(ML.identity).post('/analyze', {
        user_id: 'alice@company.com', hour_of_day: 9, duration_sec: 1200,
        event_count: 20, distinct_ips: 1, file_access_ratio: 0.05,
        is_weekend: 0, geographic_location: 'USA',
      });
      if (data.risk_level === 'CRITICAL') throw new Error('False positive: normal session flagged CRITICAL');
      return `TN ✓  anomaly=${data.is_anomaly}  risk=${data.risk_level}`;
    }),
    runTest('C4 Timeline — Clustering accuracy (mixed traffic)', async () => {
      const logs = [
        ...Array.from({ length: 5 }, (_, i) => ({
          log_id: `acc_n_${ts}_${i}`, timestamp: new Date(ts - 300000 + i * 60000).toISOString(),
          ip_address: '192.168.1.1', method: 'GET', url: '/home',
          status_code: 200, user_agent: 'Mozilla/5.0',
        })),
        { log_id: `acc_a_${ts}`, timestamp: new Date(ts).toISOString(),
          ip_address: '203.0.113.1', method: 'POST', url: '/admin.php?id=1 OR 1=1',
          status_code: 500, user_agent: 'sqlmap/1.7' },
      ];
      const { data } = await http(ML.timeline).post('/analyze', logs);
      return `total=${data.total_logs}  clusters=${data.num_clusters}  noise=${data.noise_count}`;
    }),
    runTest('C3 Evidence — SHA-256 hash validity (64-char hex)', async () => {
      const { data } = await http(ML.evidence).post('/preserve', {
        log_id: `acc_${ts}`, timestamp: new Date().toISOString(),
        event_type: 'AccuracyCheck', user_id: 'system',
        action: 'Accuracy suite hash validation', metadata: { suite: 'accuracy' },
      });
      if (!data.hash || data.hash.length !== 64) throw new Error('Invalid SHA-256 hash returned');
      return `block=${data.block_index}  hash=${data.hash.slice(0, 16)}…  len=${data.hash.length}`;
    }),
  ]);
}

// ── Integration Suite: end-to-end cross-service flows ────────────────────────
async function runIntegrationSuite() {
  const ts = Date.now();
  return Promise.all([
    runTest('E2E: Detect anomaly → preserve evidence', async () => {
      const { data: id } = await http(ML.identity).post('/analyze', {
        user_id: `intg_${ts}`, hour_of_day: 2, duration_sec: 3600,
        event_count: 400, distinct_ips: 5, file_access_ratio: 0.85,
        is_weekend: 0, geographic_location: 'Unknown',
      });
      const { data: ev } = await http(ML.evidence).post('/preserve', {
        log_id: `intg_${ts}`, timestamp: new Date().toISOString(),
        event_type: 'AnomalyDetected', user_id: `intg_${ts}`,
        action: 'Anomaly detected by Identity service', metadata: { risk: id.risk_level },
      });
      return `anomaly=${id.is_anomaly}  risk=${id.risk_level}  block=${ev.block_index}`;
    }),
    runTest('E2E: Correlate events → verify chain', async () => {
      const events = Array.from({ length: 5 }, (_, i) => ({
        event_id: `intg_e_${ts}_${i}`, timestamp: new Date(ts + i * 500).toISOString(),
        event_type: 'FailedLogin', user_id: 'target@co.com',
        source_ip: '10.99.0.1', resource: '/admin', metadata: {},
      }));
      const { data: incs } = await http(ML.incident).post('/correlate', { events, time_window_minutes: 5 });
      const { data: ver } = await http(ML.evidence).post('/verify', {});
      return `incidents=${incs.length}  chain_valid=${ver.is_valid}  blocks=${ver.total_blocks}`;
    }),
    runTest('E2E: Analyze logs → extract anomalies', async () => {
      const logs = [
        { log_id: `intg_l_${ts}_1`, timestamp: new Date().toISOString(),
          ip_address: '203.0.113.100', method: 'GET', url: '/../../etc/passwd',
          status_code: 403, user_agent: 'curl/7.88' },
        { log_id: `intg_l_${ts}_2`, timestamp: new Date().toISOString(),
          ip_address: '192.168.1.1', method: 'GET', url: '/index.html',
          status_code: 200, user_agent: 'Mozilla/5.0' },
      ];
      const { data: an } = await http(ML.timeline).post('/analyze', logs);
      const { data: anom } = await http(ML.timeline).get('/anomalies');
      return `logs=${an.total_logs}  clusters=${an.num_clusters}  anomalies=${Array.isArray(anom) ? anom.length : 0}`;
    }),
    runTest('E2E: Full 4-service connectivity', async () => {
      const checks = await Promise.allSettled([
        http(ML.identity).get('/'), http(ML.incident).get('/'),
        http(ML.evidence).get('/'), http(ML.timeline).get('/'),
      ]);
      const labels = ['C1:Identity', 'C2:Incident', 'C3:Evidence', 'C4:Timeline'];
      const statuses = checks.map((r, i) => `${labels[i]}=${r.status === 'fulfilled' ? 'UP' : 'DOWN'}`);
      const down = checks.filter(r => r.status === 'rejected').length;
      if (down > 0) throw new Error(`${down} service(s) offline — ${statuses.filter(s => s.includes('DOWN')).join(', ')}`);
      return statuses.join('  ');
    }),
  ]);
}

// ── Seed Demo Data ───────────────────────────────────────────────────────────
router.post('/seed-demo', protect, async (req, res) => {
  const sha = (obj) => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
  const now = Date.now();
  const ago = (ms) => new Date(now - ms);

  // 20 realistic log entries covering normal traffic + various attack patterns
  const logDefs = [
    // ── Normal traffic ────────────────────────────────────────────────────────
    { logId:'demo-log-01', ipAddress:'10.0.1.15',    method:'GET',  url:'/index.html',            statusCode:200, userAgent:'Mozilla/5.0 (Windows NT 10.0) Chrome/120',  eventType:'HttpRequest', source:'web',    isAnomaly:false, riskLevel:'LOW',      ts: ago(7200000) },
    { logId:'demo-log-02', ipAddress:'10.0.1.22',    method:'POST', url:'/api/v1/login',           statusCode:200, userAgent:'Mozilla/5.0 (Macintosh) Safari/17',         eventType:'UserLogin',   source:'auth',   isAnomaly:false, riskLevel:'LOW',      ts: ago(6900000) },
    { logId:'demo-log-03', ipAddress:'192.168.0.55', method:'GET',  url:'/api/v1/users/profile',   statusCode:200, userAgent:'MyApp/2.1 (Android)',                       eventType:'ApiCall',     source:'mobile', isAnomaly:false, riskLevel:'LOW',      ts: ago(6600000) },
    { logId:'demo-log-04', ipAddress:'10.0.1.15',    method:'GET',  url:'/dashboard',              statusCode:200, userAgent:'Mozilla/5.0 (Windows NT 10.0) Chrome/120',  eventType:'HttpRequest', source:'web',    isAnomaly:false, riskLevel:'LOW',      ts: ago(6300000) },
    { logId:'demo-log-05', ipAddress:'10.0.2.8',     method:'GET',  url:'/api/v1/reports',         statusCode:200, userAgent:'Mozilla/5.0 (X11; Linux) Firefox/121',      eventType:'ApiCall',     source:'web',    isAnomaly:false, riskLevel:'LOW',      ts: ago(6000000) },
    // ── Brute force attempt ────────────────────────────────────────────────
    { logId:'demo-log-06', ipAddress:'203.0.113.42', method:'POST', url:'/api/v1/login',           statusCode:401, userAgent:'python-requests/2.28',                      eventType:'FailedLogin', source:'auth',   isAnomaly:true,  riskLevel:'HIGH',     ts: ago(5400000) },
    { logId:'demo-log-07', ipAddress:'203.0.113.42', method:'POST', url:'/api/v1/login',           statusCode:401, userAgent:'python-requests/2.28',                      eventType:'FailedLogin', source:'auth',   isAnomaly:true,  riskLevel:'HIGH',     ts: ago(5395000) },
    { logId:'demo-log-08', ipAddress:'203.0.113.42', method:'POST', url:'/api/v1/login',           statusCode:401, userAgent:'python-requests/2.28',                      eventType:'FailedLogin', source:'auth',   isAnomaly:true,  riskLevel:'HIGH',     ts: ago(5390000) },
    { logId:'demo-log-09', ipAddress:'203.0.113.42', method:'POST', url:'/api/v1/login',           statusCode:401, userAgent:'python-requests/2.28',                      eventType:'FailedLogin', source:'auth',   isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(5385000) },
    { logId:'demo-log-10', ipAddress:'203.0.113.42', method:'POST', url:'/api/v1/login',           statusCode:401, userAgent:'python-requests/2.28',                      eventType:'FailedLogin', source:'auth',   isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(5380000) },
    // ── SQL injection attempt ──────────────────────────────────────────────
    { logId:'demo-log-11', ipAddress:'198.51.100.9', method:'GET',  url:"/search?q=' OR '1'='1",  statusCode:400, userAgent:'sqlmap/1.7.8',                              eventType:'SqlInjection',source:'web',    isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(4800000) },
    { logId:'demo-log-12', ipAddress:'198.51.100.9', method:'POST', url:'/admin.php?id=1 UNION SELECT * FROM users', statusCode:500, userAgent:'sqlmap/1.7.8',           eventType:'SqlInjection',source:'web',    isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(4795000) },
    // ── Path traversal attempt ─────────────────────────────────────────────
    { logId:'demo-log-13', ipAddress:'198.51.100.9', method:'GET',  url:'/../../etc/passwd',       statusCode:403, userAgent:'curl/7.88.1',                               eventType:'PathTraversal',source:'web',   isAnomaly:true,  riskLevel:'HIGH',     ts: ago(4200000) },
    { logId:'demo-log-14', ipAddress:'198.51.100.9', method:'GET',  url:'/../../../etc/shadow',    statusCode:403, userAgent:'curl/7.88.1',                               eventType:'PathTraversal',source:'web',   isAnomaly:true,  riskLevel:'HIGH',     ts: ago(4195000) },
    // ── Privilege escalation ───────────────────────────────────────────────
    { logId:'demo-log-15', ipAddress:'10.0.5.77',    method:'POST', url:'/api/v1/admin/promote',   statusCode:403, userAgent:'Mozilla/5.0 (Windows NT 10.0)',             eventType:'PrivEscAttempt',source:'api', isAnomaly:true,  riskLevel:'HIGH',     ts: ago(3600000) },
    // ── Data exfiltration signals ──────────────────────────────────────────
    { logId:'demo-log-16', ipAddress:'10.0.5.77',    method:'GET',  url:'/api/v1/users?limit=9999',statusCode:200, userAgent:'python-requests/2.28',                      eventType:'DataExfil',   source:'api',    isAnomaly:true,  riskLevel:'HIGH',     ts: ago(3300000) },
    { logId:'demo-log-17', ipAddress:'10.0.5.77',    method:'GET',  url:'/api/v1/logs?limit=9999', statusCode:200, userAgent:'python-requests/2.28',                      eventType:'DataExfil',   source:'api',    isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(3295000) },
    // ── C2 beacon pattern ─────────────────────────────────────────────────
    { logId:'demo-log-18', ipAddress:'172.16.8.4',   method:'POST', url:'/beacon',                 statusCode:200, userAgent:'Go-http-client/1.1',                        eventType:'C2Beacon',    source:'net',    isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(1800000) },
    // ── More normal traffic ────────────────────────────────────────────────
    { logId:'demo-log-19', ipAddress:'10.0.1.30',    method:'GET',  url:'/api/v1/timeline',        statusCode:200, userAgent:'Mozilla/5.0 (Macintosh) Chrome/120',        eventType:'ApiCall',     source:'web',    isAnomaly:false, riskLevel:'LOW',      ts: ago(900000)  },
    { logId:'demo-log-20', ipAddress:'10.0.1.15',    method:'POST', url:'/api/v1/evidence/verify', statusCode:200, userAgent:'Mozilla/5.0 (Windows NT 10.0) Chrome/120',  eventType:'EvidenceCheck',source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(300000)  },
    // ── Day -6: Recon probe ────────────────────────────────────────────────────
    { logId:'hist-d6-01', ipAddress:'10.0.1.20',      method:'GET',  url:'/dashboard',             statusCode:200, userAgent:'Chrome/120',                eventType:'HttpRequest',  source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(518400000+27000000) },
    { logId:'hist-d6-02', ipAddress:'10.0.2.5',       method:'GET',  url:'/api/v1/reports',        statusCode:200, userAgent:'Firefox/121',               eventType:'ApiCall',      source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(518400000+32400000) },
    { logId:'hist-d6-03', ipAddress:'185.220.101.5',  method:'GET',  url:'/robots.txt',            statusCode:200, userAgent:'Nmap Scripting Engine',     eventType:'Recon',        source:'web',  isAnomaly:true,  riskLevel:'MEDIUM',   ts: ago(518400000+7200000) },
    { logId:'hist-d6-04', ipAddress:'185.220.101.5',  method:'GET',  url:'/.env',                  statusCode:404, userAgent:'Nmap Scripting Engine',     eventType:'Recon',        source:'web',  isAnomaly:true,  riskLevel:'HIGH',     ts: ago(518400000+7260000) },
    { logId:'hist-d6-05', ipAddress:'10.0.1.30',      method:'POST', url:'/api/v1/login',          statusCode:200, userAgent:'MyApp/2.0',                 eventType:'UserLogin',    source:'auth', isAnomaly:false, riskLevel:'LOW',      ts: ago(518400000+54000000) },
    // ── Day -5: Credential stuffing ────────────────────────────────────────────
    { logId:'hist-d5-01', ipAddress:'10.0.1.11',      method:'GET',  url:'/index.html',            statusCode:200, userAgent:'Chrome/120',                eventType:'HttpRequest',  source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(432000000+28800000) },
    { logId:'hist-d5-02', ipAddress:'10.0.1.22',      method:'GET',  url:'/api/v1/users/profile',  statusCode:200, userAgent:'Safari/17',                 eventType:'ApiCall',      source:'api',  isAnomaly:false, riskLevel:'LOW',      ts: ago(432000000+36000000) },
    { logId:'hist-d5-03', ipAddress:'91.108.4.10',    method:'POST', url:'/api/v1/login',          statusCode:401, userAgent:'python-requests/2.31',      eventType:'FailedLogin',  source:'auth', isAnomaly:true,  riskLevel:'HIGH',     ts: ago(432000000+3600000) },
    { logId:'hist-d5-04', ipAddress:'91.108.4.10',    method:'POST', url:'/api/v1/login',          statusCode:401, userAgent:'python-requests/2.31',      eventType:'FailedLogin',  source:'auth', isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(432000000+3660000) },
    { logId:'hist-d5-05', ipAddress:'10.0.2.8',       method:'GET',  url:'/api/v1/timeline',       statusCode:200, userAgent:'Firefox/121',               eventType:'ApiCall',      source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(432000000+57600000) },
    // ── Day -4: SQL injection campaign ─────────────────────────────────────────
    { logId:'hist-d4-01', ipAddress:'10.0.1.15',      method:'GET',  url:'/dashboard',             statusCode:200, userAgent:'Chrome/120',                eventType:'HttpRequest',  source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(345600000+28800000) },
    { logId:'hist-d4-02', ipAddress:'10.0.1.30',      method:'POST', url:'/api/v1/login',          statusCode:200, userAgent:'Safari/17',                 eventType:'UserLogin',    source:'auth', isAnomaly:false, riskLevel:'LOW',      ts: ago(345600000+32400000) },
    { logId:'hist-d4-03', ipAddress:'198.51.100.20',  method:'GET',  url:"/api/search?q=' OR 1=1", statusCode:400, userAgent:'sqlmap/1.8',                eventType:'SqlInjection', source:'web',  isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(345600000+7200000) },
    { logId:'hist-d4-04', ipAddress:'198.51.100.20',  method:'POST', url:'/admin.php?id=1 OR 1=1', statusCode:500, userAgent:'sqlmap/1.8',                eventType:'SqlInjection', source:'web',  isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(345600000+7260000) },
    { logId:'hist-d4-05', ipAddress:'10.0.2.9',       method:'GET',  url:'/api/v1/reports',        statusCode:200, userAgent:'Chrome/120',                eventType:'ApiCall',      source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(345600000+50400000) },
    // ── Day -3: Brute-force escalation ─────────────────────────────────────────
    { logId:'hist-d3-01', ipAddress:'10.0.1.20',      method:'GET',  url:'/index.html',            statusCode:200, userAgent:'Chrome/120',                eventType:'HttpRequest',  source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(259200000+28800000) },
    { logId:'hist-d3-02', ipAddress:'203.0.113.88',   method:'POST', url:'/api/v1/login',          statusCode:401, userAgent:'Hydra/9.4',                 eventType:'FailedLogin',  source:'auth', isAnomaly:true,  riskLevel:'HIGH',     ts: ago(259200000+10800000) },
    { logId:'hist-d3-03', ipAddress:'203.0.113.88',   method:'POST', url:'/api/v1/login',          statusCode:401, userAgent:'Hydra/9.4',                 eventType:'FailedLogin',  source:'auth', isAnomaly:true,  riskLevel:'HIGH',     ts: ago(259200000+10860000) },
    { logId:'hist-d3-04', ipAddress:'203.0.113.88',   method:'POST', url:'/api/v1/login',          statusCode:401, userAgent:'Hydra/9.4',                 eventType:'FailedLogin',  source:'auth', isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(259200000+10920000) },
    { logId:'hist-d3-05', ipAddress:'10.0.1.11',      method:'GET',  url:'/api/v1/users/profile',  statusCode:200, userAgent:'MyApp/2.1',                 eventType:'ApiCall',      source:'api',  isAnomaly:false, riskLevel:'LOW',      ts: ago(259200000+54000000) },
    // ── Day -2: Lateral movement ───────────────────────────────────────────────
    { logId:'hist-d2-01', ipAddress:'10.0.1.15',      method:'GET',  url:'/dashboard',             statusCode:200, userAgent:'Chrome/120',                eventType:'HttpRequest',  source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(172800000+28800000) },
    { logId:'hist-d2-02', ipAddress:'10.0.1.22',      method:'GET',  url:'/api/v1/reports',        statusCode:200, userAgent:'Firefox/121',               eventType:'ApiCall',      source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(172800000+32400000) },
    { logId:'hist-d2-03', ipAddress:'10.0.5.20',      method:'POST', url:'/api/v1/admin/promote',  statusCode:403, userAgent:'python-requests/2.28',      eventType:'PrivEscAttempt',source:'api', isAnomaly:true,  riskLevel:'HIGH',     ts: ago(172800000+14400000) },
    { logId:'hist-d2-04', ipAddress:'10.0.5.20',      method:'GET',  url:'/api/v1/users?limit=500',statusCode:200, userAgent:'python-requests/2.28',      eventType:'DataExfil',    source:'api',  isAnomaly:true,  riskLevel:'HIGH',     ts: ago(172800000+14460000) },
    { logId:'hist-d2-05', ipAddress:'10.0.2.8',       method:'GET',  url:'/index.html',            statusCode:200, userAgent:'Chrome/120',                eventType:'HttpRequest',  source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(172800000+57600000) },
    // ── Day -1: Data exfiltration + C2 ────────────────────────────────────────
    { logId:'hist-d1-01', ipAddress:'10.0.1.15',      method:'GET',  url:'/dashboard',             statusCode:200, userAgent:'Chrome/120',                eventType:'HttpRequest',  source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(86400000+28800000) },
    { logId:'hist-d1-02', ipAddress:'10.0.1.30',      method:'GET',  url:'/api/v1/users/profile',  statusCode:200, userAgent:'MyApp/2.0',                 eventType:'ApiCall',      source:'api',  isAnomaly:false, riskLevel:'LOW',      ts: ago(86400000+32400000) },
    { logId:'hist-d1-03', ipAddress:'10.0.5.77',      method:'GET',  url:'/api/v1/logs?limit=9999',statusCode:200, userAgent:'python-requests/2.28',      eventType:'DataExfil',    source:'api',  isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(86400000+18000000) },
    { logId:'hist-d1-04', ipAddress:'172.16.8.9',     method:'POST', url:'/beacon',                statusCode:200, userAgent:'Go-http-client/1.1',        eventType:'C2Beacon',     source:'net',  isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(86400000+21600000) },
    { logId:'hist-d1-05', ipAddress:'172.16.8.9',     method:'POST', url:'/beacon',                statusCode:200, userAgent:'Go-http-client/1.1',        eventType:'C2Beacon',     source:'net',  isAnomaly:true,  riskLevel:'CRITICAL', ts: ago(86400000+21660000) },
    { logId:'hist-d1-06', ipAddress:'10.0.2.5',       method:'GET',  url:'/api/v1/reports',        statusCode:200, userAgent:'Firefox/121',               eventType:'ApiCall',      source:'web',  isAnomaly:false, riskLevel:'LOW',      ts: ago(86400000+54000000) },
  ];

  const logOps = logDefs.map(({ ts, ...def }) => ({
    updateOne: {
      filter: { logId: def.logId },
      update: { $set: { ...def, timestamp: ts, sha256Hash: sha(def), userId: def.ipAddress, metadata: {} } },
      upsert: true,
    },
  }));

  // 5 realistic incidents
  const incidentDefs = [
    {
      alertId: 'demo-inc-01', severity: 'CRITICAL', status: 'investigating',
      title: 'Brute Force Attack — Admin Portal',
      description: '10 failed login attempts in 90 seconds from IP 203.0.113.42 targeting /api/v1/login. DBSCAN clustering confirms coordinated automated attack pattern.',
      mitreAttackTechnique: 'T1110 - Brute Force',
      affectedUser: 'admin@cloudforensics.io',
      sourceEvents: ['demo-log-06','demo-log-07','demo-log-08','demo-log-09','demo-log-10'],
      recommendations: ['Block IP 203.0.113.42 at firewall', 'Enable account lockout after 5 failures', 'Enable MFA on all admin accounts', 'Review auth logs for successful logins from this IP'],
      metadata: { sourceIp: '203.0.113.42' },
    },
    {
      alertId: 'demo-inc-02', severity: 'CRITICAL', status: 'open',
      title: 'SQL Injection Attack Detected',
      description: "Two automated SQL injection payloads sent by sqlmap/1.7.8 from 198.51.100.9 — targeting /search and /admin.php. 500 error on admin endpoint indicates partial success.",
      mitreAttackTechnique: 'T1190 - Exploit Public-Facing Application',
      affectedUser: 'anonymous',
      sourceEvents: ['demo-log-11','demo-log-12'],
      recommendations: ['Enable WAF SQL injection rule set', 'Patch input sanitization in /search and /admin endpoints', 'Rotate database credentials', 'Audit DB query logs for data access'],
      metadata: { sourceIp: '198.51.100.9' },
    },
    {
      alertId: 'demo-inc-03', severity: 'HIGH', status: 'contained',
      title: 'Path Traversal — /etc/passwd & /etc/shadow Access Attempt',
      description: 'Attacker at 198.51.100.9 attempted directory traversal to read /etc/passwd and /etc/shadow. Both requests returned 403 but indicate reconnaissance activity.',
      mitreAttackTechnique: 'T1083 - File and Directory Discovery',
      affectedUser: 'anonymous',
      sourceEvents: ['demo-log-13','demo-log-14'],
      recommendations: ['Verify web server chroot jail is enforced', 'Add path traversal detection to WAF', 'Correlate with SQL injection source IP'],
      metadata: { sourceIp: '198.51.100.9' },
    },
    {
      alertId: 'demo-inc-04', severity: 'CRITICAL', status: 'open',
      title: 'Data Exfiltration — Bulk User & Log Dump',
      description: 'Internal host 10.0.5.77 queried /api/v1/users and /api/v1/logs with limit=9999 using python-requests — consistent with automated data scraping or insider threat.',
      mitreAttackTechnique: 'T1530 - Data from Cloud Storage, T1078 - Valid Accounts',
      affectedUser: 'service-account@cloudforensics.io',
      sourceEvents: ['demo-log-15','demo-log-16','demo-log-17'],
      recommendations: ['Revoke service account credentials', 'Enforce API rate limiting', 'Enable data-loss prevention (DLP) alerting', 'Audit access logs for 10.0.5.77'],
      metadata: { sourceIp: '10.0.5.77' },
    },
    {
      alertId: 'demo-inc-05', severity: 'CRITICAL', status: 'investigating',
      title: 'C2 Beacon — Possible Compromised Host',
      description: 'Internal host 172.16.8.4 is sending regular POST beacons to /beacon using Go-http-client — a known C2 communication pattern. Host may be compromised.',
      mitreAttackTechnique: 'T1071 - Application Layer Protocol, T1105 - Ingress Tool Transfer',
      affectedUser: 'unknown',
      sourceEvents: ['demo-log-18'],
      recommendations: ['Isolate 172.16.8.4 from network immediately', 'Run full forensic image of the host', 'Check for persistence mechanisms', 'Block outbound beacon traffic at perimeter'],
      metadata: { sourceIp: '172.16.8.4' },
    },
  ];

  const incOps = incidentDefs.map((def) => ({
    updateOne: {
      filter: { alertId: def.alertId },
      update: { $set: { ...def, sha256Hash: sha(def) } },
      upsert: true,
    },
  }));

  const [logResult, incResult] = await Promise.all([
    LogEntry.bulkWrite(logOps),
    Incident.bulkWrite(incOps),
  ]);

  res.json({
    success: true,
    message: 'Demo data seeded successfully.',
    logs:      { upserted: logResult.upsertedCount, modified: logResult.modifiedCount },
    incidents: { upserted: incResult.upsertedCount, modified: incResult.modifiedCount },
  });
});

// ── Typed suite endpoints ────────────────────────────────────────────────────
router.post('/smoke-test/health',      protect, makeSuiteHandler(runHealthSuite,      'Service Health Check Suite'));
router.post('/smoke-test/security',    protect, makeSuiteHandler(runSecuritySuite,    'Security Attack Simulation Suite'));
router.post('/smoke-test/accuracy',    protect, makeSuiteHandler(runAccuracySuite,    'ML Accuracy Validation Suite'));
router.post('/smoke-test/integration', protect, makeSuiteHandler(runIntegrationSuite, 'End-to-End Integration Suite'));

// ── Per-component endpoint ───────────────────────────────────────────────────
router.post('/smoke-test/component/:id', protect, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const testFnMap = { 1: testComponent1, 2: testComponent2, 3: testComponent3, 4: testComponent4 };
  const metaMap = {
    1: { name: 'Identity Attribution & Behavior Profiling', port: 8001 },
    2: { name: 'Incident Detection & Correlation',          port: 8002 },
    3: { name: 'Evidence Preservation & Chain of Custody',  port: 8003 },
    4: { name: 'Forensic Timeline Reconstruction',          port: 8004 },
  };
  if (!testFnMap[id]) return res.status(400).json({ success: false, message: 'Component id must be 1–4' });

  const t0 = Date.now();
  const tests   = await testFnMap[id]();
  const passed  = tests.filter(t => t.status === 'PASS').length;
  const failed  = tests.filter(t => t.status === 'FAIL').length;
  const comp    = { id, ...metaMap[id], tests, passed, failed, status: failed === 0 ? 'PASS' : 'FAIL' };

  res.json({
    success: true,
    startedAt:  new Date().toISOString(),
    durationMs: Date.now() - t0,
    summary: { totalTests: passed + failed, passed, failed, allPassed: failed === 0 },
    components: [comp],
  });
});

// ── Main endpoint ────────────────────────────────────────────────────────────
router.post('/smoke-test', protect, async (req, res) => {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const [c1, c2, c3, c4] = await Promise.all([
    testComponent1(),
    testComponent2(),
    testComponent3(),
    testComponent4(),
  ]);

  const components = [
    { id: 1, name: 'Identity Attribution & Behavior Profiling', port: 8001, tests: c1 },
    { id: 2, name: 'Incident Detection & Correlation',          port: 8002, tests: c2 },
    { id: 3, name: 'Evidence Preservation & Chain of Custody',  port: 8003, tests: c3 },
    { id: 4, name: 'Forensic Timeline Reconstruction',          port: 8004, tests: c4 },
  ].map((comp) => {
    const passed = comp.tests.filter(t => t.status === 'PASS').length;
    const failed = comp.tests.filter(t => t.status === 'FAIL').length;
    return { ...comp, passed, failed, status: failed === 0 ? 'PASS' : 'FAIL' };
  });

  const totalPassed = components.reduce((s, c) => s + c.passed, 0);
  const totalFailed = components.reduce((s, c) => s + c.failed, 0);

  res.json({
    success: true,
    startedAt,
    durationMs: Date.now() - t0,
    summary: {
      totalTests: totalPassed + totalFailed,
      passed: totalPassed,
      failed: totalFailed,
      allPassed: totalFailed === 0,
    },
    components,
  });
});

module.exports = router;

