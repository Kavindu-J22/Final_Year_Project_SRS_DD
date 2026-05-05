const express      = require('express');
const LogEntry     = require('../models/LogEntry');
const ClusterResult= require('../models/ClusterResult');
const Incident     = require('../models/Incident');
const { protect }  = require('../middleware/authMiddleware');
const { timelineService, incidentService, identityService, evidenceService } = require('../services/mlService');
const { computeSHA256, generateAnalysisId, generateLogId } = require('../utils/hashUtils');

const router = express.Router();

// ── In-Memory Stateful Session Tracker ────────────────────────────────────────
const activeSessions = new Map();

function getGeoLocation(ip) {
    if (!ip) return 'Unknown';
    if (ip.startsWith('175.')) return 'North Korea';
    if (ip.startsWith('185.')) return 'Russia';
    if (ip.startsWith('45.')) return 'USA';
    if (ip.startsWith('82.')) return 'UK';
    return 'USA'; // Default benign
}

function updateSessionContext(body) {
    const userId = body.userId || body.ipAddress || 'unknown';
    // Use the simulated timestamp if provided, else real time
    const now = body.timestamp ? new Date(body.timestamp) : new Date();
    
    if (!activeSessions.has(userId)) {
        activeSessions.set(userId, {
            startTime: now.getTime(),
            eventCount: 0,
            ips: new Set(),
            fileAccesses: 0,
            lastGeo: getGeoLocation(body.ipAddress)
        });
    }
    
    const session = activeSessions.get(userId);
    session.eventCount += 1;
    if (body.ipAddress) session.ips.add(body.ipAddress);
    if (body.url?.includes('/files')) session.fileAccesses += 1;
    session.lastGeo = getGeoLocation(body.ipAddress);
    
    const durationSec = Math.max(0.5, (now.getTime() - session.startTime) / 1000);
    const requestVelocity = session.eventCount / durationSec;
    const fileAccessRatio = session.fileAccesses / session.eventCount;
    
    return {
        user_id: userId,
        hour_of_day: now.getHours(),
        duration_sec: durationSec,
        event_count: session.eventCount,
        distinct_ips: session.ips.size,
        file_access_ratio: fileAccessRatio,
        is_weekend: [0, 6].includes(now.getDay()) ? 1 : 0,
        geographic_location: session.lastGeo,
        request_velocity: parseFloat(requestVelocity.toFixed(4))
    };
}


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
    
    // Save to Incident collection
    if (alerts.length > 0) {
      console.log(`[Incident Engine] Received ${alerts.length} alerts for event ${event.event_id}`);
      for (const alert of alerts) {
        console.log(`Saving alert: ${alert.alert_id} | ${alert.title}`);
        const sha256Hash = computeSHA256(alert);
        const saved = await Incident.findOneAndUpdate(
          { alertId: alert.alert_id },
          {
            alertId:              alert.alert_id,
            severity:             alert.severity,
            title:                alert.title,
            description:          alert.description,
            mitreAttackTechnique: alert.mitre_technique,
            affectedUser:         alert.affected_user,
            sourceEvents:         alert.source_events,
            recommendations:      alert.recommendations,
            killChainStage:       alert.kill_chain_stage,
            killChainProgress:    alert.kill_chain_progress,
            threatForecast:       alert.threat_forecast,
            sha256Hash,
          },
          { upsert: true, new: true }
        );
        console.log(`Successfully saved incident: ${saved._id}`);
      }
    }
  } catch (err) { console.error("Incident Engine Error:", err.message); }

  // Component 1: Identity Profiling (Stateful Session)
  let identityAlerts = null;
  try {
    const sessionContext = updateSessionContext(body);
    identityAlerts = await identityService.analyzeSession(sessionContext);
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
       event_type: log.eventType || 'LogIngestion',
       user_id: log.userId || log.ipAddress || 'system',
       action: `Method ${log.method} on ${log.url}`,
       metadata: {
         ip_address: log.ipAddress,
         method: log.method,
         url: log.url,
         status_code: log.statusCode,
         hash: sha256Hash
       }
    });
  } catch (err) { console.error("Evidence Preservation Error:", err.message); }

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

