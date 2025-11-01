/**
 * Backend API Server for Web3 Authentication
 * Handles nonce generation, signature verification, and JWT issuance
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jqrtenskuvbpbrhykqko.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcnRlbnNrdXZicGJyaHlrcWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkwNjUsImV4cCI6MjA3NzU5NTA2NX0.16MXHJB89rstHX8eLjaSUpzRSkEpDhjapOh78CjRtgk';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true
}));
app.use(express.json());

/**
 * Generate random nonce for wallet authentication
 */
function generateNonce() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * GET /api/auth/nonce/:walletAddress
 * Generate and return a nonce for wallet signature
 */
app.get('/api/auth/nonce/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const checksummedAddress = ethers.getAddress(walletAddress);
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const { data, error } = await supabase
      .from('auth_nonces')
      .insert([{
        wallet_address: checksummedAddress,
        nonce: nonce,
        expires_at: expiresAt.toISOString(),
        used: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating nonce:', error);
      return res.status(500).json({ error: 'Failed to generate nonce' });
    }

    const message = `Sign this message to authenticate with DilSe Matchify.\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;

    res.json({
      nonce: nonce,
      message: message,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Nonce generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify
 * Verify wallet signature and issue JWT token
 */
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const checksummedAddress = ethers.getAddress(walletAddress);

    const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/);
    if (!nonceMatch) {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    const nonce = nonceMatch[1];

    const { data: nonceData, error: nonceError } = await supabase
      .from('auth_nonces')
      .select('*')
      .eq('nonce', nonce)
      .eq('wallet_address', checksummedAddress)
      .eq('used', false)
      .maybeSingle();

    if (nonceError || !nonceData) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }

    if (new Date(nonceData.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Nonce has expired' });
    }

    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
      console.error('Signature verification failed:', err);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (recoveredAddress.toLowerCase() !== checksummedAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Signature does not match wallet address' });
    }

    await supabase
      .from('auth_nonces')
      .update({ used: true })
      .eq('id', nonceData.id);

    const { data: walletData } = await supabase
      .from('wallet_addresses')
      .select('user_id, profiles(*)')
      .eq('wallet_address', checksummedAddress)
      .maybeSingle();

    let userId;
    let isNewUser = false;

    if (walletData && walletData.user_id) {
      userId = walletData.user_id;
    } else {
      isNewUser = true;
      const tempEmail = `${checksummedAddress.toLowerCase()}@wallet.dilsematchify.com`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: crypto.randomBytes(32).toString('hex'),
        options: {
          data: {
            wallet_address: checksummedAddress,
            auth_method: 'wallet'
          }
        }
      });

      if (authError || !authData.user) {
        console.error('Error creating user:', authError);
        return res.status(500).json({ error: 'Failed to create user account' });
      }

      userId = authData.user.id;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: tempEmail,
          first_name: 'User',
          last_name: checksummedAddress.substring(0, 8),
          profile_completion: 10
        }]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      const { error: walletError } = await supabase
        .from('wallet_addresses')
        .insert([{
          user_id: userId,
          wallet_address: checksummedAddress,
          is_primary: true
        }]);

      if (walletError) {
        console.error('Error linking wallet:', walletError);
      }
    }

    const token = jwt.sign(
      {
        userId: userId,
        walletAddress: checksummedAddress,
        authMethod: 'wallet'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: token,
      userId: userId,
      walletAddress: checksummedAddress,
      isNewUser: isNewUser,
      message: isNewUser ? 'Account created successfully' : 'Login successful'
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/link-wallet
 * Link a wallet address to an existing authenticated user
 */
app.post('/api/auth/link-wallet', async (req, res) => {
  try {
    const { walletAddress, userId, authToken } = req.body;

    if (!walletAddress || !userId || !authToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let decoded;
    try {
      decoded = jwt.verify(authToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (decoded.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const checksummedAddress = ethers.getAddress(walletAddress);

    const { data: existingWallet } = await supabase
      .from('wallet_addresses')
      .select('user_id')
      .eq('wallet_address', checksummedAddress)
      .maybeSingle();

    if (existingWallet) {
      return res.status(400).json({ error: 'Wallet already linked to another account' });
    }

    const { data: userWallets } = await supabase
      .from('wallet_addresses')
      .select('id')
      .eq('user_id', userId);

    const isPrimary = !userWallets || userWallets.length === 0;

    const { error } = await supabase
      .from('wallet_addresses')
      .insert([{
        user_id: userId,
        wallet_address: checksummedAddress,
        is_primary: isPrimary
      }]);

    if (error) {
      console.error('Error linking wallet:', error);
      return res.status(500).json({ error: 'Failed to link wallet' });
    }

    res.json({
      success: true,
      message: 'Wallet linked successfully',
      walletAddress: checksummedAddress
    });

  } catch (error) {
    console.error('Link wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Web3 Auth API Server running on http://localhost:${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET  /api/auth/nonce/:walletAddress`);
  console.log(`   POST /api/auth/verify`);
  console.log(`   POST /api/auth/link-wallet`);
  console.log(`   GET  /api/health`);
});

export default app;
