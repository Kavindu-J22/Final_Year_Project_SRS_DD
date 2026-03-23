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
    res.json({ success: true, data: result, source: 'ml_service' });
  } catch (err) {
    // ── Fallback: reconstruct verification from MongoDB ForensicBlock mirror ──
    try {
      const blocks = await ForensicBlock.find().sort({ blockIndex: 1 });
      if (blocks.length === 0) {
        return res.json({
          success: true,
          data: {
            is_valid: false, total_blocks: 0, blocks_verified: 0,
            integrity_status: 'EMPTY',
            message: 'No evidence blocks in database. Preserve evidence first.',
          },
          source: 'mongodb_fallback',
        });
      }
      const invalid = blocks.filter(b => b.integrityStatus !== 'VALID').length;
      res.json({
        success: true,
        data: {
          is_valid: invalid === 0,
          total_blocks: blocks.length,
          blocks_verified: blocks.length,
          integrity_status: invalid === 0 ? 'VALID' : 'COMPROMISED',
          first_block_time: blocks[0]?.timestamp,
          last_block_time:  blocks[blocks.length - 1]?.timestamp,
          message: invalid === 0
            ? `All ${blocks.length} block(s) verified via MongoDB mirror`
            : `${invalid} block(s) failed integrity check`,
        },
        source: 'mongodb_fallback',
      });
    } catch (dbErr) {
      res.status(503).json({ success: false, message: 'Evidence service unavailable.', error: err.message });
    }
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

