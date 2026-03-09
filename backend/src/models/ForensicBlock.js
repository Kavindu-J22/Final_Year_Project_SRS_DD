const mongoose = require('mongoose');

/**
 * ForensicBlock – mirrors a single block in the cryptographic evidence chain
 * produced by Component 3 (Evidence Preservation / Digital Notary).
 * Each block is immutable after creation – MongoDB enforces this via the
 * unique index on currentHash.
 */
const forensicBlockSchema = new mongoose.Schema(
  {
    blockIndex:   { type: Number, required: true, unique: true },
    timestamp:    { type: Date,   required: true },

    // ── Evidence payload ──────────────────────────────────────────────────────
    data: {
      logId:     { type: String },
      eventType: { type: String },
      userId:    { type: String },
      action:    { type: String },
      metadata:  { type: mongoose.Schema.Types.Mixed },
    },

    // ── Cryptographic chain ───────────────────────────────────────────────────
    currentHash:  { type: String, required: true, unique: true },
    previousHash: { type: String, required: true },
    signature:    { type: String, required: true },

    // ── Relations ─────────────────────────────────────────────────────────────
    relatedIncidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    relatedLogId:      { type: String },

    // ── Integrity state ───────────────────────────────────────────────────────
    integrityStatus: {
      type: String,
      enum: ['VALID', 'COMPROMISED', 'UNVERIFIED'],
      default: 'VALID',
    },
  },
  { timestamps: true }
);

forensicBlockSchema.index({ blockIndex: 1 });
forensicBlockSchema.index({ currentHash: 1 });
forensicBlockSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ForensicBlock', forensicBlockSchema);

