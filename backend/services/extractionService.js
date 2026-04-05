const extractData = (text) => {
  if (!text) return { software: [], cveIds: [], keywords: [] };

  // 🔹 Extract CVE IDs
  const cveRegex = /CVE-\d{4}-\d+/gi;
  const cveIds = text.match(cveRegex) || [];

  // 🔹 Simple keyword detection
  const keywordsList = ["exploit", "vulnerability", "malware", "ransomware", "attack"];
  const keywords = keywordsList.filter(word =>
    text.toLowerCase().includes(word)
  );

  // 🔹 Simple software detection
  const softwareList = ["openssl", "apache", "nginx", "node", "linux"];
  const software = softwareList.filter(soft =>
    text.toLowerCase().includes(soft)
  );

  return {
    cveIds,
    keywords,
    software
  };
};

module.exports = extractData;