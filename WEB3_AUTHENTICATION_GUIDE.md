# Web3 Blockchain Wallet Authentication Guide

## Overview
The DilSe Matchify platform now supports blockchain wallet-based authentication using **ethers.js**, allowing users to login with MetaMask or create custom wallets. This provides a secure, decentralized authentication method alongside traditional email/password login.

## Architecture

### Authentication Flow

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │────────>│   Backend    │────────>│   Supabase   │
│  (ethers.js)│         │  (Node.js)   │         │  (Database)  │
└─────────────┘         └──────────────┘         └──────────────┘
      │                        │                         │
      │  1. Connect Wallet     │                         │
      ├───────────────────────>│                         │
      │                        │                         │
      │  2. Request Nonce      │                         │
      ├───────────────────────>│  3. Generate & Store    │
      │                        ├────────────────────────>│
      │                        │  4. Return Nonce        │
      │  5. Nonce + Message   <┤                         │
      │<───────────────────────┤                         │
      │                        │                         │
      │  6. Sign Message       │                         │
      │  (with private key)    │                         │
      │                        │                         │
      │  7. Send Signature     │                         │
      ├───────────────────────>│  8. Verify Signature    │
      │                        │  (ethers.verifyMessage) │
      │                        │                         │
      │                        │  9. Mark Nonce Used     │
      │                        ├────────────────────────>│
      │                        │                         │
      │                        │  10. Issue JWT Token    │
      │  11. JWT Token        <┤                         │
      │<───────────────────────┤                         │
      │                        │                         │
      │  12. Store Token       │                         │
      │  (localStorage)        │                         │
      └────────────────────────┘                         │
```

## Components

### 1. Database Schema

#### Tables Created:

**`wallet_addresses`**
- Stores wallet addresses linked to user profiles
- Supports multiple wallets per user
- Primary wallet designation

**`auth_nonces`**
- Temporary nonces for authentication
- 5-minute expiration
- Single-use (prevents replay attacks)

**`custom_wallets`**
- Encrypted private keys for custom wallets
- Created via ethers.Wallet.createRandom()

### 2. Backend API (`backend/server.js`)

Express.js server with three main endpoints:

#### `GET /api/auth/nonce/:walletAddress`
Generates a random nonce for wallet signature.

**Request:**
```bash
GET http://localhost:3001/api/auth/nonce/0x1234567890abcdef...
```

**Response:**
```json
{
  "nonce": "a1b2c3d4...",
  "message": "Sign this message to authenticate...\n\nNonce: a1b2c3d4...",
  "expiresAt": "2024-01-01T12:30:00.000Z"
}
```

**Security:**
- Validates Ethereum address format
- Stores nonce with expiration (5 minutes)
- Returns formatted message for signing

#### `POST /api/auth/verify`
Verifies the signed message and issues JWT token.

**Request:**
```json
{
  "walletAddress": "0x1234567890abcdef...",
  "signature": "0xabcdef123456...",
  "message": "Sign this message to authenticate..."
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "uuid-here",
  "walletAddress": "0x1234567890abcdef...",
  "isNewUser": false,
  "message": "Login successful"
}
```

**Security Checks:**
1. Validates nonce exists and not used
2. Checks nonce expiration
3. Verifies signature using `ethers.verifyMessage()`
4. Marks nonce as used (prevents replay)
5. Issues JWT token with 7-day expiration

#### `POST /api/auth/link-wallet`
Links additional wallet to existing account.

**Request:**
```json
{
  "walletAddress": "0xabcdef123456...",
  "userId": "uuid-here",
  "authToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. Frontend Module (`js/web3-auth.js`)

#### Web3AuthManager Class

**Methods:**

**`connectWallet()`**
```javascript
const { address, provider } = await web3AuthManager.connectWallet();
// Prompts MetaMask connection
// Returns wallet address and provider
```

**`authenticateWithWallet()`**
```javascript
const result = await web3AuthManager.authenticateWithWallet();
// Full authentication flow:
// 1. Connect wallet
// 2. Request nonce
// 3. Sign message
// 4. Verify signature
// 5. Store JWT token
```

**`requestNonce(walletAddress)`**
```javascript
const { nonce, message } = await web3AuthManager.requestNonce(address);
// Fetches nonce from backend
```

**`signMessage(message)`**
```javascript
const signature = await web3AuthManager.signMessage(message);
// Signs message with wallet's private key
```

**`verifySignature(walletAddress, signature, message)`**
```javascript
const result = await web3AuthManager.verifySignature(address, sig, msg);
// Sends signature to backend for verification
```

#### Custom Wallet Functions

**`createCustomWallet(password)`**
```javascript
const { address, mnemonic } = await createCustomWallet('myPassword123');
// Creates new wallet with ethers.Wallet.createRandom()
// Encrypts private key with password
// Stores in localStorage
// Returns address and recovery phrase
```

**`loadCustomWallet(password)`**
```javascript
const wallet = await loadCustomWallet('myPassword123');
// Decrypts wallet from localStorage
// Returns ethers.Wallet instance
```

**`importWalletFromMnemonic(mnemonic, password)`**
```javascript
const { address } = await importWalletFromMnemonic(
  'word1 word2 word3...',
  'myPassword123'
);
// Imports wallet from recovery phrase
// Encrypts and stores in localStorage
```

## User Flows

### Flow 1: MetaMask Login

1. User clicks "Connect Wallet" button
2. MetaMask popup appears
3. User approves connection
4. Wallet address retrieved
5. Nonce requested from backend
6. User signs message in MetaMask
7. Signature sent to backend
8. Backend verifies signature
9. JWT token issued
10. User logged in

**Code Example:**
```javascript
// Triggered by button click
const result = await web3AuthManager.authenticateWithWallet();
if (result.success) {
  window.location.href = 'homepage.html';
}
```

### Flow 2: Custom Wallet Creation

1. User clicks "Create or Import Custom Wallet"
2. Chooses "Create New"
3. Enters password (min 8 characters)
4. Wallet created with random private key
5. Recovery phrase displayed
6. Wallet encrypted and stored locally
7. User can now authenticate with custom wallet

**Code Example:**
```javascript
const { address, mnemonic } = await createCustomWallet('SecurePass123');
// Display mnemonic to user for backup
alert(`Save this recovery phrase: ${mnemonic}`);
```

### Flow 3: Import Existing Wallet

1. User clicks "Create or Import Custom Wallet"
2. Chooses "Import Existing"
3. Enters 12/24 word recovery phrase
4. Creates password for encryption
5. Wallet imported and encrypted
6. Stored in localStorage

**Code Example:**
```javascript
const mnemonic = 'word1 word2 word3...';
const { address } = await importWalletFromMnemonic(mnemonic, 'NewPass123');
```

## Security Features

### 1. Nonce-Based Authentication
- **Purpose**: Prevent replay attacks
- **Implementation**: Random 32-byte hex string
- **Expiration**: 5 minutes
- **Single-use**: Marked as used after verification

### 2. Signature Verification
```javascript
const recoveredAddress = ethers.verifyMessage(message, signature);
// Ensures signature was created by claimed wallet
```

### 3. JWT Tokens
- **Algorithm**: HS256
- **Expiration**: 7 days
- **Payload**: userId, walletAddress, authMethod
- **Storage**: localStorage (Web3 auth) or httpOnly cookie (email auth)

### 4. HTTPS (Production)
- All API calls should use HTTPS
- Prevents man-in-the-middle attacks
- Protects sensitive data in transit

### 5. Encrypted Wallet Storage
- Private keys never stored in plain text
- AES-256 encryption with user password
- Only encrypted JSON stored in localStorage

### 6. Row Level Security (RLS)
- Database policies enforce access control
- Users can only access their own wallets
- Nonces have time-based visibility

## Installation & Setup

### Prerequisites
```bash
# Required dependencies
npm install ethers@^6.9.0
npm install express@^4.18.2
npm install jsonwebtoken@^9.0.2
npm install cors@^2.8.5
npm install dotenv@^16.3.1
npm install concurrently@^8.2.2
```

### Environment Variables
Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=3001
```

### Database Migration
```bash
# Already applied:
# - add_web3_authentication.sql
# Creates: wallet_addresses, auth_nonces, custom_wallets tables
```

### Start Servers
```bash
# Start both backend API and frontend
npm start

# Or separately:
npm run backend  # Starts backend on port 3001
npx http-server DilseMatchify_frontend -p 8080  # Frontend on 8080
```

## API Reference

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### 1. Get Nonce
```http
GET /auth/nonce/:walletAddress
```

**Parameters:**
- `walletAddress` - Ethereum address (0x...)

**Response:** 200 OK
```json
{
  "nonce": "string",
  "message": "string",
  "expiresAt": "ISO8601 datetime"
}
```

**Errors:**
- 400 - Invalid wallet address
- 500 - Server error

#### 2. Verify Signature
```http
POST /auth/verify
Content-Type: application/json
```

**Body:**
```json
{
  "walletAddress": "0x...",
  "signature": "0x...",
  "message": "string"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "token": "JWT token",
  "userId": "uuid",
  "walletAddress": "0x...",
  "isNewUser": boolean,
  "message": "string"
}
```

**Errors:**
- 400 - Missing fields / Invalid format
- 401 - Invalid or expired nonce / Invalid signature
- 500 - Server error

#### 3. Link Wallet
```http
POST /auth/link-wallet
Content-Type: application/json
```

**Body:**
```json
{
  "walletAddress": "0x...",
  "userId": "uuid",
  "authToken": "JWT token"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Wallet linked successfully",
  "walletAddress": "0x..."
}
```

## Testing

### Test MetaMask Login

1. Install MetaMask browser extension
2. Create or import test account
3. Navigate to login page
4. Click "Connect Wallet"
5. Approve connection in MetaMask
6. Sign authentication message
7. Verify login success

### Test Custom Wallet

1. Navigate to login page
2. Click "Create or Import Custom Wallet"
3. Choose "Create New"
4. Enter password
5. Save recovery phrase
6. Verify wallet created
7. Test login with custom wallet

### Test Security

**Nonce Expiration:**
```javascript
// Request nonce
const { nonce } = await fetch('/api/auth/nonce/0x...').then(r => r.json());

// Wait 6 minutes
await new Promise(r => setTimeout(r, 360000));

// Try to use expired nonce - should fail
```

**Replay Attack Prevention:**
```javascript
// Complete authentication once
const result1 = await verifySignature(address, signature, message);
// Success

// Try to reuse same signature - should fail
const result2 = await verifySignature(address, signature, message);
// Error: nonce already used
```

## Best Practices

### Frontend

1. **Always validate addresses**
```javascript
if (!ethers.isAddress(address)) {
  throw new Error('Invalid address');
}
```

2. **Use checksummed addresses**
```javascript
const checksummed = ethers.getAddress(address);
```

3. **Handle wallet disconnection**
```javascript
window.ethereum.on('accountsChanged', (accounts) => {
  if (accounts.length === 0) {
    // User disconnected wallet
    web3AuthManager.disconnect();
  }
});
```

4. **Store sensitive data securely**
```javascript
// Don't store private keys in localStorage!
// Only store encrypted wallet JSON
```

### Backend

1. **Always verify signatures**
```javascript
const recoveredAddress = ethers.verifyMessage(message, signature);
if (recoveredAddress !== claimedAddress) {
  throw new Error('Invalid signature');
}
```

2. **Expire nonces promptly**
```javascript
// Set expiration to 5 minutes max
const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
```

3. **Use secure JWT secrets**
```javascript
// Generate strong secret
const JWT_SECRET = crypto.randomBytes(64).toString('hex');
```

4. **Rate limit authentication attempts**
```javascript
// Prevent brute force attacks
// Implement rate limiting middleware
```

## Troubleshooting

### MetaMask Not Detected
```javascript
if (typeof window.ethereum === 'undefined') {
  alert('Please install MetaMask');
  window.open('https://metamask.io/download', '_blank');
}
```

### Signature Verification Failed
- Check message format matches exactly
- Verify nonce hasn't expired
- Ensure wallet address is checksummed
- Confirm signature is from correct wallet

### Custom Wallet Issues
- Password must be 8+ characters
- Recovery phrase must be 12 or 24 words
- Check localStorage for encrypted wallet
- Verify encryption password is correct

### Backend Connection Failed
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Restart backend
npm run backend
```

## Production Deployment

### Required Changes

1. **Use HTTPS**
```javascript
const API_BASE_URL = 'https://api.yourdomain.com';
```

2. **Secure JWT Secret**
```env
JWT_SECRET=<64-byte-random-hex-string>
```

3. **Set CORS properly**
```javascript
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true
}));
```

4. **Use httpOnly cookies**
```javascript
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

5. **Implement rate limiting**
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/auth', limiter);
```

6. **Add logging and monitoring**
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## Future Enhancements

1. **Multi-chain support** - Support other blockchains (Polygon, BSC, etc.)
2. **Hardware wallet support** - Ledger, Trezor integration
3. **ENS domain support** - Use ENS names instead of addresses
4. **NFT-gated features** - Require specific NFTs for premium features
5. **Token-based rewards** - Issue platform tokens for activity
6. **DAO governance** - Decentralized platform decisions

## Support

For issues or questions:
- Check browser console for errors
- Verify MetaMask is connected
- Ensure backend is running
- Check Supabase database connection
- Review API endpoint responses

## License

ISC License - See LICENSE file for details
