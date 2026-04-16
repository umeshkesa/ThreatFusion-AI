const assetService = require("../services/assetService");
const Asset = require("../models/Asset");

// Add or Update asset (Smart Add)
const createAsset = async (req, res) => {
  try {
    const { assetName, software, criticality, company_id } = req.body;
    
    // 1. Check if asset already exists for this company (Case-Insensitive)
    const existing = await Asset.findOne({ 
      assetName: { $regex: new RegExp(`^${assetName}$`, "i") }, 
      company_id 
    });

    if (existing) {
      // 2. If exists, append new software and update criticality if provided
      const updatedAsset = await Asset.findByIdAndUpdate(
        existing._id,
        { 
          $push: { software: { $each: software } },
          $set: { criticality: criticality || existing.criticality }
        },
        { new: true }
      );
      return res.json(updatedAsset);
    }

    // 3. Otherwise, create new
    const asset = await Asset.create(req.body);
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: "Failed to process asset" });
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

// Delete asset
const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    await assetService.deleteAsset(id);
    res.json({ message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete asset" });
  }
};

// Delete software
const deleteSoftware = async (req, res) => {
  try {
    const { assetId, softwareId } = req.params;
    const asset = await assetService.deleteSoftware(assetId, softwareId);
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete software" });
  }
};

module.exports = {
  createAsset,
  getAssets,
  deleteAsset,
  deleteSoftware
};