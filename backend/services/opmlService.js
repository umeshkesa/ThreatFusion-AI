const fs = require("fs");
const xml2js = require("xml2js");
const path = require("path");

// 🔁 Recursive function
const extractFeeds = (outlines) => {
  let feeds = [];

  outlines.forEach(item => {
    if (item.$?.xmlUrl) {
      feeds.push(item.$.xmlUrl);
    }

    if (item.outline) {
      feeds = feeds.concat(extractFeeds(item.outline));
    }
  });

  return feeds;
};

// const getFeedsFromOPML = async () => {
//   // const data = fs.readFileSync("./data/feeds.opml");
//   const data = fs.readFileSync(__dirname + "/data/feeds.opml");

//   // const result = await xml2js.parseStringPromise(data);

//   // const outlines = result.opml.body[0].outline;

//   // // ✅ Use recursive extraction
//   // const feeds = extractFeeds(outlines);

//   // console.log("Total feeds extracted:", feeds.length);

//   // return feeds;

//    return [
//     "https://feeds.feedburner.com/TheHackersNews",
//     "https://www.bleepingcomputer.com/feed/",
//     "https://www.securityweek.com/feed/"
//   ];
// };

const getFeedsFromOPML = async () => {
  try {
    const filePath = path.join(__dirname, "../data/feeds.opml");

    console.log("📂 Reading OPML from:", filePath);

    const data = fs.readFileSync(filePath, "utf-8");

    const result = await xml2js.parseStringPromise(data);

    const outlines = result.opml.body[0].outline;

    const feeds = extractFeeds(outlines);

    console.log("✅ Total feeds extracted:", feeds.length);

    return feeds;

  } catch (err) {
    console.log("❌ OPML ERROR:", err.message);

    console.log("⚠️ OPML failed, using fallback feeds");

    return [
      "https://feeds.feedburner.com/TheHackersNews",
      "https://www.bleepingcomputer.com/feed/",
      "https://www.securityweek.com/feed/"
    ];
  }
};

module.exports = getFeedsFromOPML;