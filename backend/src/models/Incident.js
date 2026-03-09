const mongoose = require('mongoose');

/**
 * Incident – persists alerts raised by Component 2 (Correlation Engine).
 * Every incident is preserved in the evidence chain and linked to a ForensicBlock.
 */
const incidentSchema = new mongoose.Schema(
  {
    alertId:             { type: String, required: true, unique: true },
    severity:            { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true, index: true },
    title:               { type: String, required: true },
    description:         { type: String, required: true },
    mitreAttackTechnique:{ type: String },
    affectedUser:        { type: String },
    sourceEvents:        [{ type: String }],
    recommendations:     [{ type: String }],

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'false_positive'],
      default: 'open',
      index: true,
    },
    assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt:  { type: Date },

    // ── Digital Notary reference ──────────────────────────────────────────────
    sha256Hash:  { type: String },
    blockIndex:  { type: Number },
    isPreserved: { type: Boolean, default: false },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

incidentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);

