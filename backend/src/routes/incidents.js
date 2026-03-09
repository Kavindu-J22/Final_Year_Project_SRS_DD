const express       = require('express');
const Incident      = require('../models/Incident');
const ForensicBlock = require('../models/ForensicBlock');
const { protect }   = require('../middleware/authMiddleware');
const { incidentService, evidenceService } = require('../services/mlService');
const { computeSHA256 } = require('../utils/hashUtils');

const router = express.Router();

// ── GET /api/incidents ────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 20, severity, status } = req.query;
  const query = {};
  if (severity) query.severity = severity;
  if (status)   query.status   = status;

  const [total, incidents] = await Promise.all([
    Incident.countDocuments(query),
    Incident.find(query).sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit).populate('assignedTo', 'name email'),
  ]);

  res.json({ success: true, total, page: +page, totalPages: Math.ceil(total / limit), data: incidents });
});

// ── POST /api/incidents/correlate ─────────────────────────────────────────────
router.post('/correlate', protect, async (req, res) => {
  const { events, timeWindowMinutes = 30 } = req.body;
  if (!events || events.length < 2) {
    return res.status(400).json({ success: false, message: 'At least 2 events are required.' });
  }

  let mlAlerts;
  try {
    mlAlerts = await incidentService.correlateEvents(events, timeWindowMinutes);
  } catch (err) {
    return res.status(503).json({ success: false, message: 'Incident detection service unavailable.', error: err.message });
  }

  const saved = [];
  for (const alert of mlAlerts) {
    const sha256Hash = computeSHA256(alert);

    // Upsert incident in MongoDB
    const incident = await Incident.findOneAndUpdate(
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
        sha256Hash,
      },
      { upsert: true, new: true }
    );

    // Preserve as evidence block (Component 3)
    try {
      const pres = await evidenceService.preserveEvidence({
        log_id:     alert.alert_id,
        timestamp:  alert.timestamp,
        event_type: 'IncidentAlert',
        user_id:    alert.affected_user,
        action:     alert.title,
        metadata:   { severity: alert.severity, mitre: alert.mitre_technique },
      });

      await ForensicBlock.findOneAndUpdate(
        { blockIndex: pres.block_index },
        {
          blockIndex:   pres.block_index,
          timestamp:    new Date(),
          data:         { logId: alert.alert_id, eventType: 'IncidentAlert', userId: alert.affected_user, action: alert.title },
          currentHash:  pres.hash,
          previousHash: pres.hash,
          signature:    pres.signature,
          relatedIncidentId: incident._id,
          integrityStatus: 'VALID',
        },
        { upsert: true, new: true }
      );

      await Incident.findByIdAndUpdate(incident._id, { isPreserved: true, blockIndex: pres.block_index });
    } catch { /* evidence service offline */ }

    saved.push(incident);
  }

  res.json({ success: true, total: saved.length, data: saved, mlAlerts });
});

// ── GET /api/incidents/ml – live alerts from ML service ───────────────────────
router.get('/ml', protect, async (req, res) => {
  try {
    const data = await incidentService.getIncidents(20);
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Incident service unavailable.', error: err.message });
  }
});

// ── PATCH /api/incidents/:id/status ──────────────────────────────────────────
router.patch('/:id/status', protect, async (req, res) => {
  const { status } = req.body;
  const incident = await Incident.findByIdAndUpdate(
    req.params.id,
    { status, ...(status === 'resolved' ? { resolvedAt: new Date() } : {}) },
    { new: true }
  );
  if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });
  res.json({ success: true, data: incident });
});

module.exports = router;

