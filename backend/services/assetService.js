const Asset = require("../models/Asset");

// 🔹 Get all assets for a company
const getAssetsByCompany = async (company_id) => {
  return await Asset.find({ company_id });
};

// 🔹 Find assets by product name
const findAssetsByName = async (company_id, name) => {
  return await Asset.find({
    company_id,
    "software.name": name.toLowerCase()
  });
};

// 🔹 Add new asset
const addAsset = async (data) => {
  return await Asset.create(data);
};

// 🔹 Delete asset
const deleteAsset = async (id) => {
  return await Asset.findByIdAndDelete(id);
};

// 🔹 Delete software from asset
const deleteSoftware = async (assetId, softwareId) => {
  return await Asset.findByIdAndUpdate(
    assetId,
    { $pull: { software: { _id: softwareId } } },
    { new: true }
  );
};

module.exports = {
  getAssetsByCompany,
  findAssetsByName,
  addAsset,
  deleteAsset,
  deleteSoftware
};