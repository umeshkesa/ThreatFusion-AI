const Asset = require("../models/Asset");

// 🔥 Match extracted products with assets
const matchAssets = async (extracted) => {
  const matchedAssets = [];

  if (!extracted.products || extracted.products.length === 0) {
    return matchedAssets;
  }

  const assets = await Asset.find();

  for (let asset of assets) {
    for (let sw of asset.software) {
      const assetSoftware = sw.name.toLowerCase();

      for (let product of extracted.products) {
        if (assetSoftware.includes(product.toLowerCase())) {
          matchedAssets.push({
            assetId: asset._id,
            assetName: asset.assetName,
            matchedProduct: product,
            version: sw.version,
            criticality: asset.criticality
          });
        }
      }
    }
  }

  return matchedAssets;
};

module.exports = matchAssets;