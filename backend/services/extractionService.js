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
  const lowerText = text.toLowerCase();

  for (let key in productDictionary) {
    const aliases = productDictionary[key];

    for (let alias of aliases) {
      if (lowerText.includes(alias.toLowerCase())) {
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

  // 🔹 Knowledge Graph Expansion
  const knowledgeGraph = require("../utils/knowledgeGraph");

  const expandedProducts = new Set(products);

  for (let prod of products) {
    const relations = knowledgeGraph[prod];

    if (relations) {
      Object.values(relations).flat().forEach(rel => {
        expandedProducts.add(rel);
      });
    }
  }

  const finalProducts = Array.from(expandedProducts);

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