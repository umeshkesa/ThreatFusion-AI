const assetService = require("../services/assetService");

// Add asset
const createAsset = async (req, res) => {
  try {
    const asset = await assetService.addAsset(req.body);
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: "Failed to add asset" });
  }
};

// Get all assets for company
const getAssets = async (req, res) => {
  try {
    const { company_id } = req.params;
    const assets = await assetService.getAssetsByCompany(company_id);
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch assets" });
  }
};

module.exports = {
  createAsset,
  getAssets
};