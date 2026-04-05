const axios = require("axios");

const fetchKEV = async () => {
  try {
    const url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

    const res = await axios.get(url);

    const kevList = res.data.vulnerabilities;

    // Convert to Set for fast lookup
    const kevSet = new Set(kevList.map(v => v.cveID));

    return kevSet;

  } catch (err) {
    console.log("KEV fetch error");
    return new Set();
  }
};

module.exports = fetchKEV;