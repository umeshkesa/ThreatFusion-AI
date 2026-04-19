const nlp = require("compromise");
const productDictionary = require("../utils/productDictionary");

// 🔹 Extract loose version (e.g., "version 1.2.3")
const extractLooseVersion = (text) => {
  const match = text.match(/version\s?([\d\.]+)/);
  return match ? match[1] : null;
};

// 🔹 Extract version (single operator)
const extractVersionInfo = (text) => {
  const patterns = [
    { regex: /<=\s?([\d\.]+)/, operator: "<=" },
    { regex: />=\s?([\d\.]+)/, operator: ">=" },
    { regex: /<\s?([\d\.]+)/, operator: "<" },
    { regex: />\s?([\d\.]+)/, operator: ">" },
    { regex: /=\s?([\d\.]+)/, operator: "=" }
  ];

  for (let p of patterns) {
    const match = text.match(p.regex);
    if (match) {
      return {
        version: match[1],
        operator: p.operator
      };
    }
  }

  return { version: null, operator: null };
};

// 🔹 Extract version RANGE (>= AND <)
const extractVersionRange = (text) => {
  const minMatch = text.match(/>=\s?([\d\.]+)/);
  const maxMatch = text.match(/<\s?([\d\.]+)/);

  if (minMatch && maxMatch) {
    return {
      min_version: minMatch[1],
      min_operator: ">=",
      max_version: maxMatch[1],
      max_operator: "<"
    };
  }

  return null;
};

// 🔹 Product extraction using dictionary (STRONGER than NLP nouns)
const extractProducts = (text) => {
  const foundProducts = new Set();
  
  for (let key in productDictionary) {
    const aliases = productDictionary[key];

    for (let alias of aliases) {
      // Use \b (word boundary) to prevent 'ios' acting as a match inside 'axios'
      // Escape special regex characters in the alias just in case
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedAlias}\\b`, 'i');
      
      if (regex.test(text)) {
        foundProducts.add(key);
      }
    }
  }

  return Array.from(foundProducts);
};

// 🔹 MAIN EXTRACTION FUNCTION
const extractData = (text) => {
  if (!text) {
    return {
      products: [],
      cveIds: [],
      keywords: []
    };
  }

  // 🔹 Normalize text
  const cleanedText = nlp(text).normalize().out("text").toLowerCase();

  // 🔹 Loose version detection
  const looseVersion = extractLooseVersion(cleanedText);

  // 🔹 CVE extraction (IMPROVED)
  const cveRegex = /CVE-\d{4}-\d{4,7}/gi;
  const cveIds = cleanedText.match(cveRegex) || [];

  // 🔹 Keywords
  const keywordsList = ["exploit", "vulnerability", "malware", "ransomware", "attack"];
  const keywords = keywordsList.filter(word => cleanedText.includes(word));

  // 🔹 Product detection
  const products = extractProducts(cleanedText);

  // 🔹 Version detection
  const versionInfo = extractVersionInfo(cleanedText);

  // 🔹 Version range detection
  const versionRange = extractVersionRange(cleanedText);

  // Note: We used to expand Knowledge Graph products here, but it caused false positives
  // by associating unrelated applications that share an OS or dependency.
  // The Knowledge Graph check is now correctly handled during the asset matching phase 
  // exclusively inside `matchProduct.js` -> `isRelated()`.
  
  const finalProducts = Array.from(new Set(products));

  return {
    products: finalProducts,
    cveIds,
    keywords,
    version: versionInfo.version || looseVersion,
    operator: versionInfo.operator,
    versionRange
  };
};

module.exports = extractData;