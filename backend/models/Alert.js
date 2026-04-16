const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  feedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Feed"
  },

  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Asset"
  },

  // Structured threat data
  product: String,
  assetName: String,
  asset_version: String,
  cveIds: [String],

  priority: {
    type: String,
    enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
  },
  malwareDetected: Boolean,
  kev: Boolean,
  severity: String,
  epss: Number,
  cvss: Number,
  message: String,
  exploitAvailable: Boolean,
  riskScore: Number,

  status: {
    type: String,
    enum: ["OPEN", "RESOLVED"],
    default: "OPEN"
  },

  company_id: {
    type: String,
    index: true
  }

}, { timestamps: true });

module.exports = mongoose.models.Alert || mongoose.model("Alert", alertSchema);