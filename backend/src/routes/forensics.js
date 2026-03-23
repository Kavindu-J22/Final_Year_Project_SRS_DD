const express       = require('express');
const ForensicBlock = require('../models/ForensicBlock');
const { protect }   = require('../middleware/authMiddleware');
const { evidenceService, timelineService, identityService } = require('../services/mlService');

const router = express.Router();

// ── POST /api/forensics/preserve ──────────────────────────────────────────────
router.post('/preserve', protect, async (req, res) => {
  try {
    const result = await evidenceService.preserveEvidence(req.body);

    await ForensicBlock.findOneAndUpdate(
      { blockIndex: result.block_index },
      {
        blockIndex:   result.block_index,
        timestamp:    new Date(),
        data:         req.body,
        currentHash:  result.hash,
        previousHash: result.hash,
        signature:    result.signature,
        integrityStatus: 'VALID',
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Evidence service unavailable.', error: err.message });
  }
});

// ── POST /api/forensics/verify ────────────────────────────────────────────────
router.post('/verify', protect, async (req, res) => {
  try {
    const result = await evidenceService.verifyChain();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Evidence service unavailable.', error: err.message });
  }
});

// ── GET /api/forensics/chain ──────────────────────────────────────────────────
router.get('/chain', protect, async (req, res) => {
  try {
    const chain = await evidenceService.getChain(100);
    res.json({ success: true, data: chain, source: 'ml_service' });
  } catch {
    // Fallback to MongoDB mirror
    const blocks = await ForensicBlock.find().sort({ blockIndex: 1 }).limit(100);
    res.json({ success: true, data: blocks, source: 'mongodb_fallback' });
  }
});

// ── GET /api/forensics/stats ──────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await evidenceService.getChainStats();
    res.json({ success: true, data: stats, source: 'ml_service' });
  } catch {
    const total = await ForensicBlock.countDocuments();
    const first = await ForensicBlock.findOne().sort({ blockIndex: 1 });
    const last  = await ForensicBlock.findOne().sort({ blockIndex: -1 });
    res.json({
      success: true,
      data: {
        total_blocks:      total,
        first_block_time:  first?.timestamp,
        last_block_time:   last?.timestamp,
        chain_hash:        last?.currentHash || 'N/A',
        integrity_status:  total > 0 ? 'VALID' : 'EMPTY',
      },
      source: 'mongodb_fallback',
    });
  }
});

// ── POST /api/forensics/timeline/analyze ─────────────────────────────────────
router.post('/timeline/analyze', protect, async (req, res) => {
  try {
    const result = await timelineService.analyzeLogs(req.body.logs);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Timeline service unavailable.', error: err.message });
  }
});

// ── GET /api/forensics/timeline/anomalies ─────────────────────────────────────
router.get('/timeline/anomalies', protect, async (req, res) => {
  try {
    const anomalies = await timelineService.getAnomalies();
    res.json({ success: true, data: anomalies });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Timeline service unavailable.', error: err.message });
  }
});

// ── POST /api/forensics/identity/analyze ─────────────────────────────────────
router.post('/identity/analyze', protect, async (req, res) => {
  try {
    const result = await identityService.analyzeSession(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Identity service unavailable.', error: err.message });
  }
});

// ── GET /api/forensics/identity/history ──────────────────────────────────────
router.get('/identity/history', protect, async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  try {
    const data = await identityService.getHistory(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Identity service unavailable.', error: err.message });
  }
});

// ── GET /api/forensics/timeline/metrics ──────────────────────────────────────
router.get('/timeline/metrics', protect, async (req, res) => {
  try {
    const data = await timelineService.getMetrics();
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Timeline service unavailable.', error: err.message });
  }
});

// ── GET /api/forensics/timeline/search/:entity ───────────────────────────────
router.get('/timeline/search/:entity', protect, async (req, res) => {
  const { entity } = req.params;
  const { field = 'ip_address' } = req.query;
  try {
    const data = await timelineService.searchEntity(entity, field);
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Timeline service unavailable.', error: err.message });
  }
});

module.exports = router;

