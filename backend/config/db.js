const mongoose = require("mongoose");
const dns = require("dns");

const configureMongoDns = (mongoUri) => {
  if (!mongoUri || !mongoUri.startsWith("mongodb+srv://")) {
    return;
  }

  const servers = (process.env.MONGO_DNS_SERVERS || "1.1.1.1,8.8.8.8")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length > 0) {
    dns.setServers(servers);
  }
};

const connectDB = async () => {
  try {
    configureMongoDns(process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    if (error.syscall === "querySrv") {
      console.error(
        "DNS SRV lookup failed. Set MONGO_DNS_SERVERS in .env to working DNS servers, for example: 1.1.1.1,8.8.8.8"
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
