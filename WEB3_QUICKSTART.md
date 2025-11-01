# Web3 Blockchain Authentication - Quick Start Guide

## 🚀 What's New

Your DilSe Matchify platform now supports **3 authentication methods**:

1. ✉️ **Email/Password** (Traditional)
2. 🦊 **MetaMask Wallet** (Web3 - External)
3. 🔐 **Custom Wallet** (Web3 - Self-Custody)

## 🎯 Quick Start

### Start the Application

```bash
# Start both backend API and frontend
npm start
```

This runs:
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:8080

### Alternative: Start Separately

```bash
# Terminal 1: Backend
npm run backend

# Terminal 2: Frontend
npx http-server DilseMatchify_frontend -p 8080 --cors
```

## 🔑 Authentication Options

### Option 1: MetaMask Login (Recommended for Web3 Users)

**Requirements:**
- MetaMask browser extension installed
- Ethereum account with small gas fee for testing

**Steps:**
1. Open http://localhost:8080/loginpage.html
2. Click **"Connect Wallet"** button
3. Approve connection in MetaMask popup
4. Sign the authentication message
5. You're logged in!

**First Time:**
- Automatically creates account linked to your wallet
- No email or password needed

### Option 2: Create Custom Wallet

**Steps:**
1. Open http://localhost:8080/loginpage.html
2. Click **"Create or Import Custom Wallet"**
3. Choose **"Create New"**
4. Enter password (min 8 characters)
5. **SAVE YOUR RECOVERY PHRASE** (12 words)
6. Wallet created and encrypted in browser storage

**Features:**
- No blockchain transaction needed
- No gas fees
- Fully self-custodial
- Can import to MetaMask later

### Option 3: Traditional Email/Password

**Steps:**
1. Open http://localhost:8080/signuppage.html
2. Fill registration form
3. Create account with email/password
4. Login normally

**Can still link a wallet later!**

## 🧪 Testing Guide

### Test 1: MetaMask Authentication

```bash
# 1. Install MetaMask
# Chrome: https://chrome.google.com/webstore/detail/metamask

# 2. Create test account in MetaMask
# 3. Visit login page
# 4. Click "Connect Wallet"
# 5. Approve connection
# 6. Sign message
# ✅ You should be redirected to homepage
```

### Test 2: Custom Wallet Creation

```javascript
// In browser console on login page:

// Create wallet
const { address, mnemonic } = await createCustomWallet('TestPass123');
console.log('Address:', address);
console.log('Mnemonic:', mnemonic);
// ⚠️ Save mnemonic safely!

// Later, load wallet
const wallet = await loadCustomWallet('TestPass123');
console.log('Loaded:', wallet.address);
```

### Test 3: Backend API

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Request nonce for test address
curl http://localhost:3001/api/auth/nonce/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1

# Should return:
# {
#   "nonce": "...",
#   "message": "...",
#   "expiresAt": "..."
# }
```

## 📊 How It Works

### MetaMask Flow (5 steps)

```
1. User clicks "Connect Wallet"
   └─> MetaMask popup appears

2. User approves connection
   └─> Wallet address retrieved

3. Backend generates nonce
   └─> Unique challenge for this session

4. User signs message in MetaMask
   └─> Proves ownership of wallet

5. Backend verifies signature
   └─> Issues JWT token
   └─> User logged in ✅
```

### Security Features

✅ **Nonce Expiration** - 5 minutes max
✅ **Single-use Nonces** - Prevents replay attacks
✅ **Signature Verification** - Cryptographic proof
✅ **JWT Tokens** - 7-day expiration
✅ **Encrypted Storage** - Private keys never exposed
✅ **HTTPS Ready** - Production security

## 🔧 Configuration

### Environment Variables (.env)

```env
# Supabase (Database)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=your-anon-key

# Backend API
PORT=3001
JWT_SECRET=your-super-secret-key-change-this

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080
```

### Database Tables

Already created via migration:

- **wallet_addresses** - Links wallets to users
- **auth_nonces** - Temporary authentication challenges
- **custom_wallets** - Encrypted custom wallet storage

## 📱 Frontend Integration

### Check if User Authenticated

```javascript
import { web3AuthManager } from './js/web3-auth.js';

if (web3AuthManager.isAuthenticated()) {
  const address = web3AuthManager.getWalletAddress();
  console.log('Logged in:', address);
}
```

### Get Current Wallet

```javascript
const address = web3AuthManager.getWalletAddress();
const userId = web3AuthManager.getUserId();
```

### Logout

```javascript
web3AuthManager.disconnect();
window.location.href = 'loginpage.html';
```

## 🐛 Troubleshooting

### MetaMask Not Detected

**Problem:** "MetaMask not detected" error

**Solution:**
1. Install MetaMask extension
2. Refresh page
3. Click "Connect Wallet" again

### Backend Not Running

**Problem:** Can't connect to API

**Solution:**
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# If not, start it
npm run backend
```

### Signature Verification Failed

**Problem:** "Invalid signature" error

**Solution:**
1. Check wallet is still connected
2. Make sure you're signing the correct message
3. Verify nonce hasn't expired (5 min)
4. Try disconnecting and reconnecting wallet

### Custom Wallet Password Incorrect

**Problem:** Can't load custom wallet

**Solution:**
1. Verify password is correct (case-sensitive)
2. Check browser localStorage:
   - Open DevTools > Application > Local Storage
   - Look for `custom_wallet_encrypted`
3. If lost password, import wallet with recovery phrase

## 📚 API Endpoints

### Backend API (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/nonce/:address` | GET | Get auth nonce |
| `/api/auth/verify` | POST | Verify signature |
| `/api/auth/link-wallet` | POST | Link wallet to account |

### Example: Get Nonce

```bash
curl http://localhost:3001/api/auth/nonce/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
```

**Response:**
```json
{
  "nonce": "abc123...",
  "message": "Sign this message to authenticate...",
  "expiresAt": "2024-01-01T12:30:00Z"
}
```

## 🎨 UI Components

### Login Page Elements

- **Email/Password Form** - Traditional login
- **Connect Wallet Button** - MetaMask integration (orange)
- **Custom Wallet Link** - Create/import wallet
- **Google/Facebook Buttons** - Social login (coming soon)

### Styling

The wallet button uses MetaMask's brand colors:
```css
background: linear-gradient(135deg, #F6851B, #E2761B);
```

## 🔐 Security Best Practices

### For Users

1. ✅ **Never share private keys**
2. ✅ **Save recovery phrases offline**
3. ✅ **Use strong wallet passwords** (8+ chars)
4. ✅ **Verify website URL** before connecting
5. ✅ **Review transaction details** before signing

### For Developers

1. ✅ **Always use HTTPS in production**
2. ✅ **Validate all wallet addresses**
3. ✅ **Expire nonces promptly** (5 min max)
4. ✅ **Use checksummed addresses**
5. ✅ **Implement rate limiting**
6. ✅ **Log authentication attempts**
7. ✅ **Never log private keys**

## 📖 Next Steps

1. **Test all authentication methods**
2. **Deploy to production** (see WEB3_AUTHENTICATION_GUIDE.md)
3. **Add social login** (Google, Facebook)
4. **Implement multi-chain support** (Polygon, BSC)
5. **Add ENS domain support**
6. **Create NFT-gated features**

## 🆘 Support

### Resources

- 📚 [Full Documentation](./WEB3_AUTHENTICATION_GUIDE.md)
- 🔗 [Ethers.js Docs](https://docs.ethers.org/)
- 🦊 [MetaMask Docs](https://docs.metamask.io/)
- 🗄️ [Supabase Docs](https://supabase.com/docs)

### Common Issues

**Q: Do users need cryptocurrency?**
A: No! Custom wallets work without any crypto. MetaMask needs a small amount for gas fees.

**Q: Can I use both email and wallet?**
A: Yes! Link a wallet to your email account for flexible login.

**Q: Is it secure?**
A: Yes! Uses industry-standard cryptographic signature verification.

**Q: What if I lose my recovery phrase?**
A: You cannot recover a wallet without the phrase. Always back it up safely.

## ✨ Features Summary

### ✅ Implemented

- [x] MetaMask wallet connection
- [x] Custom wallet creation (ethers.Wallet.createRandom)
- [x] Wallet import from mnemonic
- [x] Nonce-based authentication
- [x] Signature verification
- [x] JWT token issuance
- [x] Replay attack prevention
- [x] Nonce expiration (5 min)
- [x] Multiple wallets per user
- [x] Email/password fallback
- [x] Encrypted wallet storage
- [x] Supabase database integration
- [x] Full API documentation

### 🔮 Coming Soon

- [ ] Hardware wallet support (Ledger, Trezor)
- [ ] Multi-chain support (Polygon, BSC, etc.)
- [ ] ENS domain resolution
- [ ] WalletConnect integration
- [ ] Token-gated features
- [ ] NFT profile pictures
- [ ] On-chain identity verification

---

**Ready to authenticate with blockchain! 🚀**

Visit: http://localhost:8080/loginpage.html
