const fs = require("fs");
const xml2js = require("xml2js");

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

const getFeedsFromOPML = async () => {
  // const data = fs.readFileSync("./data/feeds.opml");

  // const result = await xml2js.parseStringPromise(data);

  // const outlines = result.opml.body[0].outline;

  // // ✅ Use recursive extraction
  // const feeds = extractFeeds(outlines);

  // console.log("Total feeds extracted:", feeds.length);

  // return feeds;

   return [
    "https://feeds.feedburner.com/TheHackersNews",
    "https://www.bleepingcomputer.com/feed/",
    "https://www.securityweek.com/feed/"
  ];
};

module.exports = getFeedsFromOPML;