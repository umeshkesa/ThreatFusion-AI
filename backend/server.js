
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const Feed = require("./models/Feed");
const Asset = require("./models/Asset");        // ← moved to top
const Alert = require("./models/Alert");        // ← moved to top
const getFeedsFromOPML = require("./services/opmlService");
const fetchRSS = require("./services/rssService");
const extractData = require("./services/extractionService");
const generateAlerts = require("./services/alertService");
const { loadExploitDB } = require("./services/exploitService");
const fetchKEV = require("./services/kevService");
const fetchMalwareSamples = require("./services/malwareService");
const assetRoutes = require("./routes/assetRoutes");

dotenv.config();
connectDB();

let kevSet = new Set();
let exploitSet = new Set();
let malwareData = [];

// ✅ Load all threat data sequentially
(async () => {
    exploitSet = await loadExploitDB();
    kevSet = await fetchKEV();
    malwareData = await fetchMalwareSamples();
    console.log("KEV loaded:", kevSet.size);
    console.log("Malware samples loaded:", malwareData.length);
    console.log("✅ All threat data ready");
})();

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/assets", assetRoutes);

app.get("/", (req, res) => {
    res.send("API Running 🚀");
});

// Fetch feeds from OPML → RSS → DB → Alerts
app.get("/fetch-feeds", async (req, res) => {
    try {
        const allFeeds = await getFeedsFromOPML();
        const shuffled = [...allFeeds].sort(() => 0.5 - Math.random());
        const feedUrls = shuffled.slice(0, 50);
        const items = await fetchRSS(feedUrls);

        let saved = 0;

        for (let item of items) {
            const extracted = extractData(item.title + " " + item.contentSnippet);

            // ✅ Skip junk BEFORE saving
            if (
                extracted.cveIds.length === 0 &&
                extracted.products.length === 0 &&
                extracted.keywords.length === 0
            ) {
                continue;
            }

            const exists = await Feed.findOne({ url: item.link });

            if (!exists) {
                const newFeed = await Feed.create({
                    source: "RSS",
                    title: item.title,
                    content: item.contentSnippet,
                    url: item.link,
                    publishedAt: item.pubDate,
                    extracted
                });

                await generateAlerts(newFeed, kevSet, malwareData);
                saved++;
                console.log("✅ SAVED:", item.title);
            }
        }

        res.json({
            message: "Feeds stored successfully",
            totalFetched: items.length,
            newSaved: saved
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get HIGH/CRITICAL alerts
app.get("/alerts", async (req, res) => {
    try {
        const alerts = await Alert.find({
            priority: { $in: ["CRITICAL", "HIGH"] }
        }).sort({ riskScore: -1 });

        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Run alerts on existing feeds
app.get("/run-alerts", async (req, res) => {  // ✅ only once
    try {
        const feeds = await Feed.find({ "extracted.products": { $exists: true, $ne: [] } });
        let count = 0;
        for (let feed of feeds) {
            console.log("🚀 Calling generateAlerts...");
            const alerts = await generateAlerts(feed, kevSet, malwareData);
            count += alerts.length;
        }
        res.json({ message: "Alerts generated", total: count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Seed test assets
app.get("/seed-assets", async (req, res) => {
    try {
        await Asset.insertMany([
            { assetName: "Web Server", software: [{ name: "apache", version: "2.4.51" }, { name: "openssl", version: "1.1.1" }], criticality: "HIGH", company_id: "company_123" },
            { assetName: "Corp Laptops", software: [{ name: "chrome", version: "119" }, { name: "windows", version: "10" }], criticality: "HIGH", company_id: "company_123" },
            { assetName: "Network", software: [{ name: "cisco", version: "15.2" }, { name: "fortinet", version: "7.0" }], criticality: "HIGH", company_id: "company_123" },
            { assetName: "Mobile Fleet", software: [{ name: "android", version: "13" }, { name: "ios", version: "17" }], criticality: "MEDIUM", company_id: "company_123" },
        ]);
        res.json({ message: "Assets seeded ✅" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/add-test-asset", async (req, res) => {
    try {
        const asset = await Asset.create({
            assetName: "Mobile Device",
            software: [
                { name: "android", version: "13" },
                { name: "chrome", version: "120" }
            ],
            criticality: "HIGH",
            company_id: "company_123"
        });
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
