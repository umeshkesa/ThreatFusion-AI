const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 5000
});


const fetchRSS = async (feedUrls) => {
  let allItems = [];

  for (let url of feedUrls) {
    try {
      const feed = await parser.parseURL(url);
      allItems.push(...feed.items);
    } catch (err) {
      console.log("❌ Failed:", url);
    }
  }

  return allItems;
};

module.exports = fetchRSS;