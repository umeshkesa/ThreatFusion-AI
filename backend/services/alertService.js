const Alert = require("../models/Alert");
const Asset = require("../models/Asset");
const calculateRisk = require("./riskService");
const getPriority = require("./priorityService");
const fetchCVEData = require("./nvdService");
const fetchEPSS = require("./epssService");
const { hasExploit } = require("./exploitService");
const detectMalware = require("./malwareDetection");

const generateAlerts = async (feed) => {
    const assets = await Asset.find();

    let alerts = [];

    for (let asset of assets) {
        for (let soft of asset.software) {

            if (feed.extracted.software.includes(soft.name)) {

                const riskScore = calculateRisk(feed, asset, cvss, epss,  isKEV, exploitAvailable, malwareDetected);
                const priority = getPriority(riskScore);

                let cvss = 0;
                let epss = 0;

                if (feed.extracted.cveIds.length > 0) {
                    const cveData = await fetchCVEData(feed.extracted.cveIds[0]);

                    if (cveData) {
                        cvss = cveData.cvss;
                    }

                     epss = await fetchEPSS(cveId);
                }

                let isKEV = false;

if (feed.extracted.cveIds.length > 0) {
  const cveId = feed.extracted.cveIds[0];

  // Check KEV
  if (kevSet.has(cveId)) {
    isKEV = true;
  }
}
                let exploitAvailable = false;

if (feed.extracted.cveIds.length > 0) {
  const cveId = feed.extracted.cveIds[0];

  if (hasExploit(cveId)) {
    exploitAvailable = true;
  }
}
                const alert = await Alert.create({
                    feedId: feed._id,
                    assetId: asset._id,
                    severity: asset.criticality,
                    riskScore,
                    priority,
                    cvss,
                    epss,
                     kev: isKEV,
                     exploitAvailable,
                     malwareDetected,
                    message: `${soft.name} vulnerability affects ${asset.assetName}`
                });

                alerts.push(alert);
            }
        }
    }

    return alerts;
};

module.exports = generateAlerts;