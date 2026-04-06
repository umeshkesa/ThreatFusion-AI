function normalize(text) {
    return text.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

module.exports = normalize;