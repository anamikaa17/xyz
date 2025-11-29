const mongoose = require('mongoose');

async function startDB() {
  // Ensure MONGO_URI is loaded from .env
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ ERROR: MONGO_URI not found in .env");
    console.error("Make sure your .env is in the PROJECT ROOT ");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // fail fast
    });

    console.log("🚀 MongoDB Connected to Atlas");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed");
    console.error(err);
    process.exit(1);
  }
}

module.exports = startDB;
