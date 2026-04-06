const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema({
  assetName: String,

  software: [
    {
      name: String,
      version: String
    }
  ],

  criticality: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH"],
    default: "MEDIUM"
  },
  company_id: String,

}, { timestamps: true });

module.exports = mongoose.models.Asset || mongoose.model("Asset", assetSchema);