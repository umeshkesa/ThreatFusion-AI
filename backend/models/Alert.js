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
  }

}, { timestamps: true });

module.exports = mongoose.models.Alert || mongoose.model("Alert", alertSchema);