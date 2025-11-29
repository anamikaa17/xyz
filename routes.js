const express = require('express');
const Retailer = require('./model');
const { genKeypair, pubToDid, encrypt, decrypt } = require('./utils/crypto');
const { verifyTrade, verifyGstin } = require('./utils/verify');
const { submitToChain } = require('./utils/chain');

const router = express.Router();

/**
 * TEST ROUTE - Simple data insertion without any utilities
 * POST /api/retailer/test
 */
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 TEST: Attempting simple insert...');
    
    const testDoc = await Retailer.create({
      retailerDid: `did:test:${Date.now()}`,
      publicKey: 'test-public-key-123',
      encMobile: 'encrypted-mobile-test',
      businessType: 'Licensed',
      trustScore: 0.6,
      status: 'Active'
    });
    
    console.log('✅ TEST: Document saved successfully:', testDoc);
    
    return res.json({
      success: true,
      message: 'Test document created',
      data: testDoc
    });
  } catch (err) {
    console.error('❌ TEST ERROR:', err);
    return res.status(500).json({ 
      error: 'Test failed', 
      details: err.message 
    });
  }
});

/**
 * Simple GET test route - just visit in browser
 * GET /api/retailer/testget
 * IMPORTANT: This MUST come BEFORE the /:did route
 */
router.get('/testget', async (req, res) => {
  try {
    console.log('🧪 GET TEST: Attempting simple insert...');
    
    const testDoc = await Retailer.create({
      retailerDid: `did:test:${Date.now()}`,
      publicKey: 'test-public-key-123',
      encMobile: 'encrypted-mobile-test',
      businessType: 'Licensed',
      trustScore: 0.6,
      status: 'Active'
    });
    
    console.log('✅ TEST: Document saved successfully:', testDoc);
    
    return res.json({
      success: true,
      message: 'Test document created! Check MongoDB Atlas now.',
      data: testDoc
    });
  } catch (err) {
    console.error('❌ TEST ERROR:', err);
    return res.json({ 
      error: 'Test failed', 
      details: err.message 
    });
  }
});

/**
 * POST /api/retailer/register
 */
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Register request received:', req.body);
    
    const { idType, idValue, mobile, metadata } = req.body;
    if (!idType || !idValue || !mobile) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'idType, idValue, mobile required' });
    }

    console.log('🔍 Starting verification...');
    let verified;
    if (idType === 'TRADE') {
      verified = await verifyTrade(idValue, metadata);
    } else if (idType === 'GST') {
      verified = await verifyGstin(idValue, metadata);
    } else {
      return res.status(400).json({ error: 'idType must be TRADE or GST' });
    }
    
    console.log('✅ Verification result:', verified);
    
    if (!verified.ok) {
      console.log('❌ Verification failed');
      return res.status(400).json({ error: `REJECTED: ${verified.reason || 'verification failed'}` });
    }

    console.log('🔑 Generating keypair...');
    const { pubB64, privB64 } = genKeypair();
    const did = pubToDid(pubB64);
    console.log('✅ DID generated:', did);

    console.log('🔒 Encrypting data...');
    const encMobile = encrypt(mobile);
    let encTrade = undefined;
    let encGst = undefined;
    let businessType = '';

    if (idType === 'TRADE') {
      encTrade = encrypt(idValue);
      businessType = 'Licensed';
    } else {
      encGst = encrypt(idValue);
      businessType = 'GST_Registered';
    }

    const trustScore = 0.6;

    console.log('💾 Attempting to save to MongoDB...');
    const doc = await Retailer.create({
      retailerDid: did,
      publicKey: pubB64,
      encTradeLicense: encTrade,
      encGstin: encGst,
      encMobile,
      businessType,
      trustScore,
      status: 'Active',
      metadata: { verification: verified.payload || null, ...metadata }
    });
    
    console.log('✅ Document saved to MongoDB:', doc._id);

    console.log('⛓️ Submitting to blockchain...');
    const tx = {
      retailerDid: did,
      publicKey: pubB64,
      trustScore,
      registrationTimestamp: new Date().toISOString()
    };
    const chainRes = await submitToChain('IdentityLedger', tx);
    console.log('✅ Blockchain submission complete');

    return res.json({
      ok: true,
      retailerDid: did,
      publicKey: pubB64,
      privateKeyBackup: privB64,
      onChain: chainRes
    });
  } catch (err) {
    console.error('❌ REGISTER ERROR:', err);
    return res.status(500).json({ error: 'server error', details: err.message });
  }
});

/**
 * GET /api/retailer/:did
 * IMPORTANT: This MUST come AFTER specific routes like /testget
 */
router.get('/:did', async (req, res) => {
  try {
    const { did } = req.params;
    const doc = await Retailer.findOne({ retailerDid: did }).lean();
    if (!doc) return res.status(404).json({ error: 'not found' });

    return res.json({
      retailerDid: doc.retailerDid,
      publicKey: doc.publicKey,
      businessType: doc.businessType,
      trustScore: doc.trustScore,
      status: doc.status,
      registrationTimestamp: doc.registrationTimestamp,
      metadata: doc.metadata
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * ADMIN ONLY: decrypt sensitive fields (for debugging)
 * POST /api/retailer/decrypt
 */
router.post('/decrypt', (req, res) => {
  try {
    const { enc } = req.body;
    if (!enc) return res.status(400).json({ error: 'enc required' });
    const plain = decrypt(enc);
    return res.json({ plain });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;