const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema({
  company_id: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    lowercase: true
  },
  version: {
    type: String,
    required: true
  },
  criticality: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium"
  },
  exposed: {
    type: Boolean,
    default: false
  },
  owner: {
    type: String,
    default: "unknown"
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.Asset || mongoose.model("Asset", assetSchema);