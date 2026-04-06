const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const Feed = require("./models/Feed");
const getFeedsFromOPML = require("./services/opmlService");
const fetchRSS = require("./services/rssService");
const extractData = require("./services/extractionService");
const generateAlerts = require("./services/alertService");
const { loadExploitDB } = require("./services/exploitService");
const fetchKEV = require("./services/kevService");
const fetchMalwareSamples = require("./services/malwareService");
const assetRoutes = require("./routes/assetRoutes");

let kevSet = new Set();
let exploitSet = new Set();
let malwareData = [];

dotenv.config();
connectDB();

(async () => {
    exploitSet = await loadExploitDB();
})();

(async () => {
    kevSet = await fetchKEV();
    console.log("KEV loaded:", kevSet.size);
})();

(async () => {
    malwareData = await fetchMalwareSamples();
    console.log("Malware samples loaded:", malwareData.length);
})();




const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/assets", assetRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("API Running 🚀");
});

// Create DB test
app.get("/createdb", async (req, res) => {
    const mongoose = require("mongoose");

    const TestSchema = new mongoose.Schema({
        name: String,
    });

    const Test = mongoose.model("Test", TestSchema);

    await Test.create({ name: "Umesh" });

    res.send("DB Created 🚀");
});

// Add single feed
app.get("/addfeed", async (req, res) => {
    try {
        const data = await Feed.create({
            source: "RSS",
            title: "Test vulnerability found",
            content: "This is a test threat",
            url: "https://test.com/article1",
            publishedAt: new Date()
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch feeds from OPML → RSS → DB
app.get("/fetch-feeds", async (req, res) => {
    try {
        //const feedUrls = await getFeedsFromOPML();   // ✅ correct
        const allFeeds = await getFeedsFromOPML();

        // 🔥 Limit feeds (example: 50)
        const shuffled =[...allFeeds].sort(() => 0.5 - Math.random());
        const feedUrls = shuffled.slice(0, 50);
        const items = await fetchRSS(feedUrls);

        let saved = 0;

        for (let item of items) {
            const exists = await Feed.findOne({ url: item.link });
            console.log("\n📰 TITLE:", item.title);

            const extracted = extractData(item.title + " " + item.contentSnippet);

            console.log("🔍 EXTRACTED:", extracted);

            if (!exists) {

                const newFeed = await Feed.create({
                    source: "RSS",
                    title: item.title,
                    content: item.contentSnippet,
                    url: item.link,
                    publishedAt: item.pubDate,
                    extracted
                });

                // 🔥 Generate alerts
                await generateAlerts(newFeed, kevSet, malwareData);

                if (
    extracted.cveIds.length === 0 &&
    extracted.products.length === 0 &&
    extracted.keywords.length === 0
) {
    continue;
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



const Alert = require("./models/Alert");

// Get only HIGH/CRITICAL alerts
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

//adding asset 
// app.get("/add-asset", async (req, res) => {
//     const asset = await Asset.create({
//         assetName: "Payment Server",
//         software: [
//             { name: "openssl", version: "1.1.1" },
//             { name: "nginx", version: "1.18" }
//         ],
//         criticality: "HIGH"
//     });

//     res.json(asset);
// });

const Asset = require("./models/Asset");

app.get("/add-test-asset", async (req, res) => {
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
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
);

