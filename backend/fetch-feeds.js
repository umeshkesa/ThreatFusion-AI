const Parser = require("rss-parser");
const Feed = require("./models/Feed");
const getFeedsFromOPML = require("./getFeedsFromOPML");
const parser = new Parser();

// 🔹 Known products
const PRODUCTS = [
  "Apache", "Cisco", "Fortinet", "Chrome",
  "Windows", "Linux", "Next.js", "React",
  "Citrix", "Apple", "Microsoft"
];

// 🔹 CVE Regex
const CVE_REGEX = /CVE-\d{4}-\d+/gi;

// 🔹 Extract CVEs
function extractCVEs(text) {
  return text.match(CVE_REGEX) || [];
}

// 🔹 Extract Products
function extractProducts(text) {
  return PRODUCTS.filter(p =>
    text.toLowerCase().includes(p.toLowerCase())
  );
}

// 🔹 Extract Keywords
function extractKeywords(text) {
  const keywords = [];
  const lower = text.toLowerCase();

  if (lower.includes("exploit")) keywords.push("exploit");
  if (lower.includes("attack")) keywords.push("attack");
  if (lower.includes("malware")) keywords.push("malware");
  if (lower.includes("ransomware")) keywords.push("ransomware");
  if (lower.includes("vulnerability")) keywords.push("vulnerability");

  return keywords;
}

// 🔹 Severity Detection
function detectSeverity(text) {
  const lower = text.toLowerCase();

  if (lower.includes("critical") || lower.includes("zero-day")) return "CRITICAL";
  if (lower.includes("high")) return "HIGH";
  if (lower.includes("medium")) return "MEDIUM";

  return "LOW";
}

// 🔹 MAIN FUNCTION
async function fetchFeeds() {
  try {
   const feeds = await getFeedsFromOPML();

    for (const url of feeds) {
      const feed = await parser.parseURL(url);

      for (const item of feed.items) {
        const title = item.title || "";
        const content = item.contentSnippet || "";
        const text = title + " " + content;

        const cveIds = extractCVEs(text);
        const products = extractProducts(text);
        const keywords = extractKeywords(text);
        const severity = detectSeverity(text);

        // 🚨 skip useless entries
        if (cveIds.length === 0 && products.length === 0) continue;

        await Feed.updateOne(
          { title },
          {
            title,
            link: item.link,
            cveIds,
            products,
            keywords,
            severity,
            createdAt: new Date()
          },
          { upsert: true }
        );

        console.log("✅ Saved:", title);
      }
    }
    console.log(feeds);
    console.log("🎯 Feed fetch complete");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

module.exports = fetchFeeds;