const mongoose = require("mongoose");

const feedSchema = new mongoose.Schema({
  source: {
    type: String, // RSS, Twitter, GitHub
    required: true
  },

  title: {
    type: String,
    required: true
  },

  content: {
    type: String
  },

  url: {
    type: String,
    unique: true // helps avoid duplicates
  },

  publishedAt: {
    type: Date
  },

  extracted: {
    products: [String],
    cveIds: [String],
    version: String,
    operator: String,
    keywords: [String],
    nerEntities: [
      {
        text: String,
        type: String,
        score: Number
      }
    ],
    versionRange: {
      min_version: String,
      min_operator: String,
      max_version: String,
      max_operator: String
    }
  },

  processed: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });
feedSchema.index({ title: 1 }, { unique: true });

module.exports = mongoose.models.Feed || mongoose.model("Feed", feedSchema);
