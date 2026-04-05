const knowledgeGraph = {
  apache: {
    uses: ["openssl"],
    runs_on: ["linux", "windows"]
  },
  nginx: {
    uses: ["openssl"],
    runs_on: ["linux"]
  },
  node: {
    runs_on: ["linux", "windows"]
  },
  windows: {
    hosts: ["iis"]
  },
  iis: {
    runs_on: ["windows"]
  }
};

module.exports = knowledgeGraph;