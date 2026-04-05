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

const generateAlerts = async (feed, kevSet, malwareData) => {

    const company_id = "company_123";

    const assets = await Asset.find({ company_id });

    let alerts = [];

    for (let asset of assets) {

        const assetName = asset.name.toLowerCase();

        console.log("➡️ Checking asset:", asset.name);

        console.log("Products from feed:", feed.extracted.products);

        console.log("Version info:", feed.extracted.version, feed.extracted.operator);

        console.log("Version range:", feed.extracted.versionRange);

        // 🔹 Product match
        let productMatch = false;

        for (let prod of feed.extracted?.products || []) {
            if (assetName === prod || isRelated(assetName, prod)) {
                productMatch = true;
                break;
            }
        }

        if (!productMatch) continue;

        // 🔥 Version Matching
        let versionMatch = true;

        // 🔥 Case 1: RANGE (>= AND <)
        if (feed.extracted?.versionRange) {
            versionMatch = isVersionInRange(
                asset.version,
                feed.extracted.versionRange
            );
        }

        // 🔥 Case 2: Single operator
        else if (feed.extracted?.version && feed.extracted?.operator) {
            versionMatch = isVersionVulnerable(
                asset.version,
                feed.extracted.version,
                feed.extracted.operator
            );
        }

        if (!versionMatch) continue;

        // 🔹 Initialize
        let cvss = 0;
        let epss = 0;
        let isKEV = false;
        let exploitAvailable = false;
        let malwareDetected = false;

        const cveId = feed.extracted?.cveIds?.[0];

        // 🔹 Enrichment
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

        // 🔹 Risk
        const riskScore = calculateRisk(
            feed,
            asset,
            cvss,
            epss,
            isKEV,
            exploitAvailable,
            malwareDetected
        );

        const priority = getPriority(riskScore);

        // 🔹 Create alert
        const alert = await Alert.create({
            company_id,
            feedId: feed._id,
            assetId: asset._id,
            product: asset.name,
            asset_version: asset.version,
            severity: asset.criticality,
            riskScore,
            priority,
            cvss,
            epss,
            kev: isKEV,
            exploitAvailable,
            malwareDetected,
            message: `${asset.name} vulnerability affects your system`
        });

        alerts.push(alert);
    }

    return alerts;
};

module.exports = generateAlerts;