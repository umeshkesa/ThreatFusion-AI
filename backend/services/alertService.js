const Alert = require("../models/Alert");
const Asset = require("../models/Asset");
const calculateRisk = require("./riskService");
const getPriority = require("./priorityService");
const fetchCVEData = require("./nvdService");
const fetchEPSS = require("./epssService");
const { hasExploit } = require("./exploitService");
const detectMalware = require("./malwareDetection");
const { isVersionVulnerable, isVersionInRange } = require("../utils/versionUtils");
const { isRelated } = require("../utils/kgUtils");
const matchAssets = require("./assetMatchingService");

const generateAlerts = async (feed, kevSet, malwareData) => {

    const company_id = "company_123";

    const assets = await Asset.find({ company_id });
    const extracted = feed.extracted;
    console.log("🔎 Extracted:", extracted);

// 🔥 MATCH ASSETS
const matchedAssets = await matchAssets(extracted);
    let alerts = [];

    for (let match of matchedAssets) {

    console.log("➡️ Matched asset:", match.assetName);

    let versionMatch = true;

    if (feed.extracted?.versionRange) {
        versionMatch = isVersionInRange(
            match.version,
            feed.extracted.versionRange
        );
    } else if (feed.extracted?.version && feed.extracted?.operator) {
        versionMatch = isVersionVulnerable(
            match.version,
            feed.extracted.version,
            feed.extracted.operator
        );
    }

  if (feed.extracted.version || feed.extracted.versionRange) {
    if (!versionMatch) continue;
}
console.log("🔎 Matched Assets:", matchedAssets);

    let cvss = 0;
    let epss = 0;
    let isKEV = false;
    let exploitAvailable = false;
    let malwareDetected = false;

    const cveId = feed.extracted?.cveIds?.[0];

    if (cveId) {
        const cveData = await fetchCVEData(cveId);
        if (cveData) {
            cvss = cveData.cvss;
        }

        epss = await fetchEPSS(cveId);

        if (kevSet && kevSet.has(cveId)) {
            isKEV = true;
        }

        if (hasExploit(cveId)) {
            exploitAvailable = true;
        }

        malwareDetected = detectMalware(cveId, malwareData);
    }

    const riskScore = calculateRisk(
        feed,
        match,
        cvss,
        epss,
        isKEV,
        exploitAvailable,
        malwareDetected
    );

    const priority = getPriority(riskScore);

    const alert = await Alert.create({
        company_id,
        feedId: feed._id,
        assetId: match.assetId,
        product: match.matchedProduct,
        asset_version: match.version,
        severity: match.criticality,
        riskScore,
        priority,
        cvss,
        epss,
        kev: isKEV,
        exploitAvailable,
        malwareDetected,
        message: `${match.assetName} vulnerability affects your system`
    });

    console.log(`🚨 ALERT: ${match.assetName} → ${priority}`);

    alerts.push(alert);
}

    return alerts;
};

module.exports = generateAlerts;