const express      = require('express');
const LogEntry     = require('../models/LogEntry');
const ClusterResult= require('../models/ClusterResult');
const { protect }  = require('../middleware/authMiddleware');
const { timelineService, incidentService, identityService, evidenceService } = require('../services/mlService');
const { computeSHA256, generateAnalysisId, generateLogId } = require('../utils/hashUtils');

const router = express.Router();

// ── GET /api/logs ─────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 50, isAnomaly, riskLevel, ipAddress, startDate, endDate } = req.query;

  const query = {};
  if (isAnomaly  !== undefined) query.isAnomaly = isAnomaly === 'true';
  if (riskLevel)                query.riskLevel  = riskLevel;
  if (ipAddress)                query.ipAddress  = { $regex: ipAddress, $options: 'i' };
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate)   query.timestamp.$lte = new Date(endDate);
  }

  const [total, logs] = await Promise.all([
    LogEntry.countDocuments(query),
    LogEntry.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(+limit),
  ]);

  res.json({ success: true, total, page: +page, totalPages: Math.ceil(total / limit), data: logs });
});

// ── POST /api/logs/ingest ─────────────────────────────────────────────────────
router.post('/ingest', protect, async (req, res) => {
  const body  = req.body;
  const logId = body.logId || generateLogId();

  // Build event for Incident Detection (Component 2)
  const event = {
    event_id:   logId,
    timestamp:  body.timestamp || new Date().toISOString(),
    event_type: body.eventType || 'HttpRequest',
    user_id:    body.userId    || body.ipAddress,
    source_ip:  body.ipAddress,
    resource:   body.url,
    metadata:   { status: body.statusCode, method: body.method },
  };

  let alerts = [];
  try {
    const result = await incidentService.ingestEvent(event);
    alerts = result.alerts || [];
  } catch { /* service offline – continue without alerts */ }

  // Component 1: Identity Profiling (Simulated Session)
  let identityAlerts = null;
  try {
    const session = {
        user_id: body.userId || body.ipAddress || 'unknown',
        hour_of_day: new Date().getHours(),
        duration_sec: 120, 
        event_count: 50,
        distinct_ips: 1,
        file_access_ratio: body.url?.includes('/files') ? 1.0 : 0.0,
        is_weekend: [0, 6].includes(new Date().getDay()) ? 1 : 0,
        geographic_location: "Unknown"
    };
    identityAlerts = await identityService.analyzeSession(session);
  } catch (err) { /* service offline */ }

  const sha256Hash = computeSHA256(body);

  const log = await LogEntry.create({
    logId, sha256Hash,
    timestamp:  new Date(body.timestamp || Date.now()),
    ipAddress:  body.ipAddress,
    method:     body.method,
    url:        body.url,
    statusCode: body.statusCode,
    userAgent:  body.userAgent,
    userId:     body.userId,
    eventType:  body.eventType,
    metadata:   body.metadata || {},
    // Store identity result if applicable
    isAnomaly:  identityAlerts?.is_anomaly || false,
    riskLevel:  identityAlerts?.risk_level || 'LOW'
  });

  // Component 3: Evidence Preservation
  try {
    await evidenceService.preserveEvidence({
       log_id: log.logId,
       timestamp: log.timestamp.toISOString(),
       ip_address: log.ipAddress,
       method: log.method,
       url: log.url,
       status_code: log.statusCode,
       hash: sha256Hash
    });
  } catch (err) { /* service offline */ }

  res.status(201).json({ success: true, data: log, alerts, identity: identityAlerts });
});

// ── POST /api/logs/analyze – batch DBSCAN / TF-IDF analysis ──────────────────
router.post('/analyze', protect, async (req, res) => {
  const { logs } = req.body;
  if (!Array.isArray(logs) || logs.length === 0) {
    return res.status(400).json({ success: false, message: 'logs[] array is required.' });
  }

  let mlResult;
  try {
    mlResult = await timelineService.analyzeLogs(logs);
  } catch (err) {
    return res.status(503).json({ success: false, message: 'Timeline ML service unavailable.', error: err.message });
  }

  const analysisId = generateAnalysisId();
  const sha256Hash = computeSHA256({ analysisId, mlResult });

  let anomalies = [];
  try { anomalies = await timelineService.getAnomalies(); } catch { /* offline */ }

  const result = await ClusterResult.create({
    analysisId, sha256Hash,
    totalLogs:        mlResult.total_logs,
    numClusters:      mlResult.num_clusters,
    noiseCount:       mlResult.noise_count,
    noiseRatio:       mlResult.noise_ratio,
    processingTimeMs: mlResult.processing_time_ms,
    clusters: mlResult.clusters.map((c) => ({
      clusterId: c.cluster_id, size: c.size, label: c.label,
      representativeLogs: c.representative_logs, isAnomaly: c.is_anomaly,
    })),
    anomalies: anomalies.map((a) => ({
      logId: a.log_id, timestamp: a.timestamp, reason: a.reason,
      suspiciousPattern: a.suspicious_pattern, severity: a.severity,
    })),
    triggeredBy: req.user._id,
  });

  // Flag anomalous logs in MongoDB
  const anomalyUrls = mlResult.clusters.filter((c) => c.is_anomaly).flatMap((c) => c.representative_logs);
  if (anomalyUrls.length) {
    await LogEntry.updateMany({ url: { $in: anomalyUrls } },
      { $set: { isAnomaly: true, riskLevel: 'HIGH', clusterLabel: 'Anomaly' } });
  }

  res.json({ success: true, analysisId, data: result, mlResult });
});

// ── GET /api/logs/:id ─────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  const log = await LogEntry.findById(req.params.id);
  if (!log) return res.status(404).json({ success: false, message: 'Log not found.' });
  res.json({ success: true, data: log });
});

module.exports = router;

