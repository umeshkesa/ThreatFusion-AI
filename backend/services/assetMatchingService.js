
const Asset = require("../models/Asset");
const matchProduct = require("../utils/matchProduct");

const matchAssets = async (extracted) => {

  const assets = await Asset.find();
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
          assetName: asset.name,
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
