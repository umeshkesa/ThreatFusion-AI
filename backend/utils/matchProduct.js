const productDictionary = require("./productDictionary");
const normalize = require("./normalize");
const { isRelated } = require("./kgUtils");

function matchProduct(assetSoftware, extractedProducts = []) {

    // 🔥 HARD SAFETY CHECK
    if (!Array.isArray(extractedProducts)) {
        console.log("❌ extractedProducts not array:", extractedProducts);
        return { matched: false, confidence: 0 };
    }

    const assetNorm = normalize(assetSoftware);

    for (let product of extractedProducts) {

        const productNorm = normalize(product);

        // ✅ Exact match
        if (assetNorm.includes(productNorm) || productNorm.includes(assetNorm)) {
            return { matched: true, confidence: 1.0 };
        }

        // ✅ Dictionary match
        for (let key in productDictionary) {
            const aliases = productDictionary[key].map(normalize);

            if (
                (assetNorm.includes(key) && aliases.includes(productNorm)) ||
                (productNorm.includes(key) && aliases.includes(assetNorm))
            ) {
                return { matched: true, confidence: 0.8 };
            }
        }

        // ✅ KG match
        if (isRelated(assetNorm, productNorm)) {
            return { matched: true, confidence: 0.6 };
        }
    }

    return { matched: false, confidence: 0 };
}

module.exports = matchProduct;