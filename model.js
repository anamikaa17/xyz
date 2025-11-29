const mongoose = require('mongoose');

const RetailerSchema = new mongoose.Schema({
  retailerDid: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true }, // base64 (SPKI DER)
  encTradeLicense: { type: String }, // base64 (iv|tag|ciphertext)
  encGstin: { type: String },
  encMobile: { type: String, required: true },
  businessType: { type: String, enum: ['Licensed', 'GST_Registered'], required: true },
  trustScore: { type: Number, default: 0.6 },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  registrationTimestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed }
});

module.exports = mongoose.model('Retailer', RetailerSchema);
