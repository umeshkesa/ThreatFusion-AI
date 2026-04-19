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
let isFeedIngestionRunning = false;

const AUTO_FEED_INGEST_INTERVAL_MINUTES = Number(process.env.AUTO_FEED_INGEST_INTERVAL_MINUTES || 1);
const AUTO_FEED_INGEST_ON_START = process.env.AUTO_FEED_INGEST_ON_START !== "false";

const runFeedIngestion = async (trigger = "manual") => {
    if (isFeedIngestionRunning) {
        return {
            message: "Feed ingestion already running",
            skipped: true,
            trigger
        };
    }

    isFeedIngestionRunning = true;

    try {
        console.log(`[feeds] Ingestion started by ${trigger}`);

        const allFeeds = await getFeedsFromOPML();
        const shuffled = [...allFeeds].sort(() => 0.5 - Math.random());
        const feedUrls = shuffled.slice(0, 50);
        const items = await fetchRSS(feedUrls);

        let saved = 0;
        let alertsCreated = 0;

        for (let item of items) {
            const text = `${item.title || ""} ${item.contentSnippet || ""}`;
            const extracted = extractData(text);

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

                const companies = await Company.find();
                for (const company of companies) {
                    const alerts = await generateAlerts(newFeed, kevSet, malwareData, company.company_id);
                    alertsCreated += alerts.length;
                }

                saved++;
                console.log("[feeds] Saved:", item.title);
            }
        }

        const result = {
            message: "Feeds stored successfully",
            trigger,
            totalFetched: items.length,
            newSaved: saved,
            alertsCreated
        };

        console.log("[feeds] Ingestion finished:", result);
        return result;
    } finally {
        isFeedIngestionRunning = false;
    }
};

const startAutomaticFeedIngestion = () => {
    if (!AUTO_FEED_INGEST_INTERVAL_MINUTES || AUTO_FEED_INGEST_INTERVAL_MINUTES <= 0) {
        console.log("[feeds] Automatic ingestion disabled");
        return;
    }

    const intervalMs = AUTO_FEED_INGEST_INTERVAL_MINUTES * 60 * 1000;

    const runAutomaticJob = async () => {
        try {
            await runFeedIngestion("automatic");
        } catch (err) {
            console.error("[feeds] Automatic ingestion failed:", err.message);
        }
    };

    setInterval(runAutomaticJob, intervalMs);
    console.log(`[feeds] Automatic ingestion scheduled every ${AUTO_FEED_INGEST_INTERVAL_MINUTES} minute(s)`);

    if (AUTO_FEED_INGEST_ON_START) {
        setTimeout(runAutomaticJob, 10000);
    }
};

(async () => {
    exploitSet = await loadExploitDB();
    kevSet = await fetchKEV();
    malwareData = await fetchMalwareSamples();
    console.log("KEV loaded:", kevSet.size);
    console.log("Malware samples loaded:", malwareData.length);
    console.log("All threat data ready");
    startAutomaticFeedIngestion();
})();

const app = express();
app.use(express.json());
app.use(cors());

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

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/api/health", (req, res) => {
    res.send("API Running");
});

app.get("/api/feeds", async (req, res) => {
    try {
        const feeds = await Feed.find().sort({ createdAt: -1 }).limit(500);
        res.json(feeds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/fetch-feeds", async (req, res) => {
    try {
        const result = await runFeedIngestion("manual");
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/alerts/:company_id", async (req, res) => {
    try {
        const { company_id } = req.params;
        const alerts = await Alert.find({ company_id }).sort({ riskScore: -1 });
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/run-alerts/:company_id", async (req, res) => {
    try {
        const { company_id } = req.params;
        const feeds = await Feed.find({ "extracted.products": { $exists: true, $ne: [] } });
        let count = 0;
        for (let feed of feeds) {
            console.log("Calling generateAlerts for", company_id);
            const alerts = await generateAlerts(feed, kevSet, malwareData, company_id);
            count += alerts.length;
        }
        res.json({ message: "Alerts generated", total: count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
