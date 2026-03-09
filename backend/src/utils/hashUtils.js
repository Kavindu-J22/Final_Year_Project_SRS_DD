const crypto = require('crypto');

/**
 * Compute a deterministic SHA-256 hex digest of any JS value.
 * Objects are canonicalized (sorted keys) before hashing.
 */
const computeSHA256 = (data) => {
  const payload =
    typeof data === 'string' ? data : JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
};

/**
 * Verify that the hash of `data` matches `expectedHash`.
 */
const verifyHash = (data, expectedHash) => computeSHA256(data) === expectedHash;

/**
 * Generate a time-stamped unique analysis ID.
 */
const generateAnalysisId = () =>
  `analysis_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

/**
 * Generate a unique log ID.
 */
const generateLogId = () => `log_${crypto.randomBytes(6).toString('hex')}`;

module.exports = { computeSHA256, verifyHash, generateAnalysisId, generateLogId };

