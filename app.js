require('dotenv').config();
const express = require('express');
const cors = require('cors');
const startDB = require('./db');
const routes = require('./routes');

const app = express();

// ===== Global Middlewares =====
app.use(cors({
  origin: '*',          // You can restrict this later
  methods: 'GET,POST,PUT,DELETE'
}));
app.use(express.json());

// ===== Start MongoDB =====
(async () => {
  try {
    await startDB();
    console.log("✅ Database initialized");
  } catch (err) {
    console.error("❌ Failed to start DB:", err.message);
  }
})();

// ===== API Routes =====
app.use('/api/retailer', routes);

// ===== Root Test Route =====
app.get('/', (req, res) => {
  res.send('🚀 SIH Retailer Identity Module Running...');
});

// ===== Error Handling Middleware =====
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌐 Server running at http://localhost:${PORT}`);
});
