const mongoose = require('mongoose');

/**
 * ClusterResult – persists DBSCAN / TF-IDF analysis output from Component 4.
 * Tracks each batch analysis run with its anomaly clusters and integrity hash.
 */
const clusterResultSchema = new mongoose.Schema(
  {
    analysisId:      { type: String, required: true, unique: true },
    totalLogs:       { type: Number, required: true },
    numClusters:     { type: Number, required: true },
    noiseCount:      { type: Number, default: 0 },
    noiseRatio:      { type: Number, default: 0 },
    processingTimeMs:{ type: Number },

    clusters: [
      {
        clusterId:         { type: Number },
        size:              { type: Number },
        label:             { type: String },
        representativeLogs:{ type: [String] },
        isAnomaly:         { type: Boolean, default: false },
      },
    ],

    anomalies: [
      {
        logId:             { type: String },
        timestamp:         { type: String },
        reason:            { type: String },
        suspiciousPattern: { type: String },
        severity:          { type: String },
      },
    ],

    // SHA-256 of the full ML response (tamper-proof ledger entry)
    sha256Hash:  { type: String },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

clusterResultSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ClusterResult', clusterResultSchema);

