const knowledgeGraph = require("./knowledgeGraph");

// 🔹 Check indirect relationship
const isRelated = (assetName, targetProduct) => {
  if (assetName === targetProduct) return true;

  const relations = knowledgeGraph[assetName];

  if (!relations) return false;

  for (let key in relations) {
    if (relations[key].includes(targetProduct)) {
      return true;
    }
  }

  return false;
};

module.exports = { isRelated };