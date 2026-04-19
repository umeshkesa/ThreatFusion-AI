const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const Feed = require("./models/Feed");
const Asset = require("./models/Asset");
const Alert = require("./models/Alert");
const Company = require("./models/Company");
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

// Auth Endpoints
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, password } = req.body;
        const company_id = "comp_" + Math.random().toString(36).substr(2, 9);
        const company = await Company.create({ name, password, company_id });
        res.json({ message: "Registration successful", company_id: company.company_id });
    } catch (err) {
        res.status(500).json({ error: "Company name already exists" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { name, password } = req.body;
        const company = await Company.findOne({ name, password });
        if (!company) return res.status(401).json({ error: "Invalid credentials" });
        res.json({ company_id: company.company_id, name: company.name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use("/api/assets", assetRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/api/health", (req, res) => {
    res.send("API Running 🚀");
});

// Get saved feeds (Increased limit to 500 so older alerts can still link back to their Source Feeds)
app.get("/api/feeds", async (req, res) => {
    try {
        const feeds = await Feed.find().sort({ createdAt: -1 }).limit(500);
        res.json(feeds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

                // generate alerts for ALL companies that have assets
                const companies = await Company.find();
                for (const company of companies) {
                    await generateAlerts(newFeed, kevSet, malwareData, company.company_id);
                }
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

// Get alerts for a specific company
app.get("/alerts/:company_id", async (req, res) => {
    try {
        const { company_id } = req.params;
        const alerts = await Alert.find({ company_id }).sort({ riskScore: -1 });
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Run alerts on existing feeds for a specific company
app.get("/run-alerts/:company_id", async (req, res) => {
    try {
        const { company_id } = req.params;
        const feeds = await Feed.find({ "extracted.products": { $exists: true, $ne: [] } });
        let count = 0;
        for (let feed of feeds) {
            console.log("🚀 Calling generateAlerts for", company_id);
            const alerts = await generateAlerts(feed, kevSet, malwareData, company_id);
            count += alerts.length;
        }
        res.json({ message: "Alerts generated", total: count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Seed test assets for a specific company
app.get("/seed-assets/:company_id", async (req, res) => {
    try {
        const { company_id } = req.params;
        const testAssets = [
            { assetName: "Web Server", software: [{ name: "apache", version: "2.4.51" }, { name: "openssl", version: "1.1.1" }], criticality: "HIGH", company_id },
            { assetName: "Corp Laptops", software: [{ name: "chrome", version: "119" }, { name: "windows", version: "10" }], criticality: "HIGH", company_id },
            { assetName: "Network", software: [{ name: "cisco", version: "15.2" }, { name: "fortinet", version: "7.0" }], criticality: "HIGH", company_id },
            { assetName: "Mobile Fleet", software: [{ name: "android", version: "13" }, { name: "ios", version: "17" }], criticality: "MEDIUM", company_id },
        ];

        let added = 0;
        for (let a of testAssets) {
            const exists = await Asset.findOne({ assetName: a.assetName, company_id: a.company_id });
            if (!exists) {
                await Asset.create(a);
                added++;
            }
        }
        res.json({ message: "Seed complete for " + company_id, newAssets: added });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
