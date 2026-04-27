const calculateRisk = (
  feed,
  asset,
  cvss = 0,
  epss = 0,
  isKEV = false,
  hasExploitDB = false,
  malwareDetected = false
) => {

  let score = 0;

  // 🔥 1. Asset Criticality (max 40)
  if (asset.criticality === "HIGH") score += 40;
  else if (asset.criticality === "MEDIUM") score += 25;
  else if (asset.criticality === "LOW") score += 10;

  // 🔥 2. CVSS (0–40)
  score += cvss * 3;

  // 🔥 3. EPSS (0–30)
  score += epss * 20;

  // 🔥 4. Exploit availability
  if (hasExploitDB) score += 10;

  // 🔥 5. KEV (real-world exploitation)
  if (isKEV) score += 15;

  // 🔥 6. Malware presence
  if (malwareDetected) score += 10;

  // 🔥 7. Keyword intelligence
  const keywords = feed.extracted?.keywords || [];

  if (keywords.includes("exploit")) score += 5;
  if (keywords.includes("ransomware")) score += 10;

  // 🔥 8. INDIRECT MATCH (knowledge graph)
  if (feed.indirectMatch) {
    score += 5;   // small boost (not 0.5 → too small)
  }

  // 🔥 9. CONFIDENCE SCORE (NEW 🔥🔥🔥)
  if (asset.confidence) {
    score += asset.confidence * 5;  // max +5  
  }

  // 🔥 10. Cap score
  if (score > 100) score = 100;

  return Math.round(score);
};

module.exports = calculateRisk;