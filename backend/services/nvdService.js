const axios = require("axios");

const fetchCVEData = async (cveId) => {
  try {
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`;

    const res = await axios.get(url);

    const vuln = res.data.vulnerabilities[0];

    if (!vuln) return null;

    const cve = vuln.cve;

    const cvss =
      cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
      cve.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore ||
      0;

    return {
      cveId,
      description: cve.descriptions[0].value,
      cvss
    };

  } catch (err) {
    console.log("NVD error:", cveId);
    return null;
  }
};

module.exports = fetchCVEData;