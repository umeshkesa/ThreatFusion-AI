const nlp = require("compromise");
const productDictionary = require("../utils/productDictionary");

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

// 🔹 NLP-based product extraction
const extractProductsNLP = (text) => {
  const doc = nlp(text);
  const nouns = doc.nouns().out("array");

  const foundProducts = new Set();

  for (let word of nouns) {
    const lower = word.toLowerCase();

    for (let key in productDictionary) {
      const aliases = productDictionary[key];

      for (let alias of aliases) {
        if (lower.includes(alias)) {
          foundProducts.add(key);
        }
      }
    }
  }

  return Array.from(foundProducts);
};

const extractData = (text) => {
  if (!text) {
    return {
      products: [],
      cveIds: [],
      keywords: []
    };
  }

  // 🔹 Normalize text using NLP
  const cleanedText = nlp(text).normalize().out("text").toLowerCase();

  // 🔹 CVE extraction
  const cveRegex = /cve-\d{4}-\d+/g;
  const cveIds = cleanedText.match(cveRegex) || [];

  // 🔹 Keywords
  const keywordsList = ["exploit", "vulnerability", "malware", "ransomware", "attack"];
  const keywords = keywordsList.filter(word => cleanedText.includes(word));

  // 🔥 NLP Product Detection
  const products = extractProductsNLP(cleanedText);

  // 🔥 Version detection
  const versionInfo = extractVersionInfo(cleanedText);

  // 🔥 Version range detection
  const versionRange = extractVersionRange(cleanedText);

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
    products,
    cveIds,
    keywords,
    version: versionInfo.version,
    operator: versionInfo.operator,
    versionRange // 🔥 new
  };
};

module.exports = extractData;