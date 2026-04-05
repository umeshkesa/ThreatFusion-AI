const axios = require("axios");

const fetchEPSS = async (cveId) => {
  try {
    const url = `https://api.first.org/data/v1/epss?cve=${cveId}`;

    const res = await axios.get(url);

    const data = res.data.data[0];

    if (!data) return 0;

    return parseFloat(data.epss); // value between 0–1

  } catch (err) {
    console.log("EPSS error:", cveId);
    return 0;
  }
};

module.exports = fetchEPSS;