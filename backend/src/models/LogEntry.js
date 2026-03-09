const mongoose = require('mongoose');

/**
 * LogEntry – stores raw log metadata ingested from cloud sources.
 * After ML analysis, anomaly fields are populated and a SHA-256
 * digest is stored for the Digital Notary chain.
 */
const logEntrySchema = new mongoose.Schema(
  {
    logId:       { type: String, required: true, unique: true },
    timestamp:   { type: Date, required: true, index: true },
    ipAddress:   { type: String, required: true },
    method:      { type: String, required: true },
    url:         { type: String, required: true },
    statusCode:  { type: Number, required: true },
    userAgent:   { type: String },
    userId:      { type: String },
    eventType:   { type: String, default: 'HttpRequest' },
    source:      { type: String, default: 'manual' },

    // ── Component 1 – Identity Profiling results ──────────────────────────────
    isAnomaly:     { type: Boolean, default: false, index: true },
    anomalyScore:  { type: Number, default: 0 },
    riskLevel:     { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    contributingFactors: [{ type: String }],
    modelVotes:    { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── Component 4 – Timeline / DBSCAN cluster results ──────────────────────
    clusterId:    { type: Number, default: null },
    clusterLabel: { type: String },

    // ── Component 3 – Digital Notary / Evidence Preservation ─────────────────
    sha256Hash:   { type: String },
    blockIndex:   { type: Number, default: null },
    isPreserved:  { type: Boolean, default: false },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

logEntrySchema.index({ isAnomaly: 1, riskLevel: 1 });
logEntrySchema.index({ ipAddress: 1 });
logEntrySchema.index({ createdAt: -1 });

module.exports = mongoose.model('LogEntry', logEntrySchema);

