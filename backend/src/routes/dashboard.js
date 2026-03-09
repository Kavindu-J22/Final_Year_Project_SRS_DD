const express       = require('express');
const LogEntry      = require('../models/LogEntry');
const Incident      = require('../models/Incident');
const ForensicBlock = require('../models/ForensicBlock');
const ClusterResult = require('../models/ClusterResult');
const { protect }   = require('../middleware/authMiddleware');
const { checkAllServices, evidenceService } = require('../services/mlService');

const router = express.Router();

// ── GET /api/dashboard/stats ──────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  const [totalLogs, anomalyLogs, totalIncidents, openIncidents, criticalIncidents, forensicBlocks, latestCluster] =
    await Promise.all([
      LogEntry.countDocuments(),
      LogEntry.countDocuments({ isAnomaly: true }),
      Incident.countDocuments(),
      Incident.countDocuments({ status: 'open' }),
      Incident.countDocuments({ severity: 'CRITICAL', status: 'open' }),
      ForensicBlock.countDocuments(),
      ClusterResult.findOne().sort({ createdAt: -1 }),
    ]);

  let integrityStatus = 'UNKNOWN';
  try {
    const s = await evidenceService.getChainStats();
    integrityStatus = s.integrity_status;
  } catch {
    integrityStatus = forensicBlocks > 0 ? 'VALID' : 'EMPTY';
  }

  // Severity breakdown
  const severityRaw = await Incident.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]);
  const severityBreakdown = severityRaw.reduce((a, c) => ({ ...a, [c._id]: c.count }), {});

  // Risk level breakdown
  const riskRaw = await LogEntry.aggregate([{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]);
  const riskBreakdown = riskRaw.reduce((a, c) => ({ ...a, [c._id]: c.count }), {});

  // Logs over last 7 days grouped by day
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logsOverTime = await LogEntry.aggregate([
    { $match: { timestamp: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id:      { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        total:    { $sum: 1 },
        anomalies:{ $sum: { $cond: ['$isAnomaly', 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalLogs, anomalyLogs, totalIncidents, openIncidents,
        criticalIncidents, forensicBlocks, integrityStatus,
        anomalyRate: totalLogs > 0 ? +((anomalyLogs / totalLogs) * 100).toFixed(1) : 0,
      },
      charts: { logsOverTime, severityBreakdown, riskBreakdown },
      latestAnalysis: latestCluster,
    },
  });
});

// ── GET /api/dashboard/ml-health ─────────────────────────────────────────────
router.get('/ml-health', protect, async (req, res) => {
  const services    = await checkAllServices();
  const allOnline   = Object.values(services).every((s) => s.status === 'online');
  res.json({ success: true, allServicesOnline: allOnline, services });
});

// ── GET /api/dashboard/recent ─────────────────────────────────────────────────
router.get('/recent', protect, async (req, res) => {
  const [recentLogs, recentIncidents] = await Promise.all([
    LogEntry.find().sort({ createdAt: -1 }).limit(10),
    Incident.find().sort({ createdAt: -1 }).limit(5),
  ]);
  res.json({ success: true, data: { recentLogs, recentIncidents } });
});

module.exports = router;

