const calculateRisk = (feed, asset, cvss = 0, epss = 0, isKEV = false, hasExploitDB = false
    ,malwareDetected = false
) => {
  let score = 0;

  // Asset importance
  if (asset.criticality === "HIGH") score += 40;
  if (asset.criticality === "MEDIUM") score += 25;
  if (asset.criticality === "LOW") score += 10;

  // CVSS contribution
  score += cvss * 4; // 0–40

  // EPSS contribution (0–1 → 0–30)
  score += epss * 30;
     if (hasExploitDB) score += 25; // 🔥 exploit exists
  if (isKEV) score += 30; // 🔥 BIG boost

  // Keywords
  const keywords = feed.extracted.keywords;

  if (keywords.includes("exploit")) score += 15;
  if (keywords.includes("ransomware")) score += 20;
    if (malwareDetected) score += 25;

  if (score > 100) score = 100;

  return Math.round(score);
};

module.exports = calculateRisk;