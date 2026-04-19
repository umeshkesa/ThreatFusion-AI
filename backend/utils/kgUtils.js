const knowledgeGraph = require("./knowledgeGraph");

// 🔹 Check indirect relationship
const isRelated = (assetName, targetFeedProduct) => {
  if (assetName === targetFeedProduct) return true;

  const assetRelations = knowledgeGraph[assetName];
  if (assetRelations) {
    // If the asset uses or runs on the vulnerable feed product
    // Example: Asset (Apache) uses Feed Vulerability (OpenSSL) -> TRUE
    if (assetRelations.uses?.includes(targetFeedProduct)) return true;
    if (assetRelations.runs_on?.includes(targetFeedProduct)) return true;
  }

  const feedRelations = knowledgeGraph[targetFeedProduct];
  if (feedRelations) {
      // If the vulnerable feed product is hosted by the asset
      // Example: Asset (Windows) hosts Feed Vulnerability (IIS) -> TRUE
      if (feedRelations.hosts?.includes(assetName)) return true;
  }

  return false;
};

module.exports = { isRelated };