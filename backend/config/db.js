const mongoose = require("mongoose");
const dns = require("dns");

// Connects to MongoDB using the MONGO_URI from the .env file.
async function connectDB() {
  try {
    // Optional local workaround for networks whose default DNS cannot resolve
    // MongoDB Atlas SRV records. Leave DNS_SERVERS unset on normal networks.
    if (process.env.DNS_SERVERS) {
      dns.setServers(process.env.DNS_SERVERS.split(",").map((server) => server.trim()));
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
