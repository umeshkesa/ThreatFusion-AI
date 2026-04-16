
const Asset = require("../models/Asset");
const matchProduct = require("../utils/matchProduct");

// company_id filters assets to only the owning company
const matchAssets = async (extracted, company_id) => {

  const query = company_id ? { company_id } : {};
  const assets = await Asset.find(query).lean();
  const matches = [];

  for (let asset of assets) {

    for (let software of asset.software) {
      const products = Array.isArray(extracted?.products)
        ? extracted.products
        : [];

      const result = matchProduct(software.name, products);

      if (result.matched) {

        matches.push({
          assetId: asset._id,
          assetName: asset.assetName,
          matchedProduct: software.name,
          version: software.version,
          criticality: asset.criticality,
          confidence: result.confidence
        });
      }
    }
  }

  return matches;
};

module.exports = matchAssets;
