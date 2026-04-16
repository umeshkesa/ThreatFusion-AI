const Alert = require("../models/Alert");
const calculateRisk = require("./riskService");
const getPriority = require("./priorityService");
const fetchCVEData = require("./nvdService");
const fetchEPSS = require("./epssService");
const { hasExploit } = require("./exploitService");
const detectMalware = require("./malwareDetection");
const { isVersionVulnerable, isVersionInRange } = require("../utils/versionUtils");
const matchAssets = require("./assetMatchingService");

const generateAlerts = async (feed, kevSet, malwareData) => {
    console.log("🔥 FULL FEED:", JSON.stringify(feed, null, 2));
    console.log("🔥 generateAlerts CALLED");
    const company_id = "company_123";
    const extracted = JSON.parse(JSON.stringify(feed.extracted || {}));

    console.log("🔎 Extracted:", extracted);
    console.log("🧪 extracted.products:", extracted?.products);

    // 🔥 MATCH ASSETS
    const matchedAssets = await matchAssets(extracted);

    let alerts = [];

    for (let match of matchedAssets) {

        console.log("➡️ Matched asset:", match.assetName);

        let versionMatch = true;

        if (extracted?.versionRange) {
            versionMatch = isVersionInRange(
                match.version,
                extracted.versionRange
            );
        } else if (extracted?.version && extracted?.operator) {
            versionMatch = isVersionVulnerable(
                match.version,
                extracted.version,
                extracted.operator
            );
        }

        if ((extracted.version || extracted.versionRange) && !versionMatch) {
            continue;
        }

        let cvss = 0;
        let epss = 0;
        let isKEV = false;
        let exploitAvailable = false;
        let malwareDetected = false;

        const cveIds = extracted?.cveIds || [];

        // 🔥 FIXED: Loop all CVEs
        if (cveIds.length > 0) {

            for (let cveId of cveIds) {

                const cveData = await fetchCVEData(cveId);
                if (cveData) {
                    cvss = Math.max(cvss, cveData.cvss || 0);
                }

                const epssScore = await fetchEPSS(cveId);
                epss = Math.max(epss, epssScore || 0);

                if (kevSet && kevSet.has(cveId)) {
                    isKEV = true;
                }

                const exploit = await hasExploit(cveId);
                if (exploit) exploitAvailable = true;

                const malware = detectMalware(cveId, malwareData);
                if (malware) malwareDetected = true;
            }
        }

        // 🔥 OPTIONAL: Prevent duplicate alerts
        const existing = await Alert.findOne({
            feedId: feed._id,
            assetId: match.assetId
        });

        if (existing) continue;

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
            assetName: match.assetName,
            asset_version: match.version,
            cveIds: extracted?.cveIds || [],
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