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

module.exports = {
  getAssetsByCompany,
  findAssetsByName,
  addAsset
};