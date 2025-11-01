/**
 * Web3 Authentication Module
 * Handles blockchain wallet connection, signature, and authentication
 */

import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.9.0/+esm';
import { supabase } from './supabase-client.js';

const API_BASE_URL = 'http://localhost:3001/api';

export class Web3AuthManager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.walletAddress = null;
  }

  async detectProvider() {
    if (typeof window.ethereum !== 'undefined') {
      return window.ethereum;
    }
    throw new Error('MetaMask or compatible wallet not detected');
  }

  async connectWallet() {
    try {
      const ethereum = await this.detectProvider();
      this.provider = new ethers.BrowserProvider(ethereum);

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.walletAddress = ethers.getAddress(accounts[0]);
      this.signer = await this.provider.getSigner();

      ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.walletAddress = ethers.getAddress(accounts[0]);
          window.location.reload();
        }
      });

      ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      return {
        address: this.walletAddress,
        provider: this.provider
      };
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }

  async requestNonce(walletAddress) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/nonce/${walletAddress}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get nonce');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Nonce request error:', error);
      throw error;
    }
  }

  async signMessage(message) {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected');
      }

      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Message signing error:', error);
      throw error;
    }
  }

  async verifySignature(walletAddress, signature, message) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          signature,
          message
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Signature verification error:', error);
      throw error;
    }
  }

  async authenticateWithWallet() {
    try {
      const { address } = await this.connectWallet();

      const { nonce, message } = await this.requestNonce(address);

      const signature = await this.signMessage(message);

      const result = await this.verifySignature(address, signature, message);

      if (result.success && result.token) {
        localStorage.setItem('web3_auth_token', result.token);
        localStorage.setItem('web3_wallet_address', result.walletAddress);
        localStorage.setItem('web3_user_id', result.userId);

        await this.syncWithSupabase(result.userId, result.walletAddress);
      }

      return result;
    } catch (error) {
      console.error('Web3 authentication error:', error);
      throw error;
    }
  }

  async syncWithSupabase(userId, walletAddress) {
    try {
      const tempEmail = `${walletAddress.toLowerCase()}@wallet.dilsematchify.com`;
      const tempPassword = localStorage.getItem('web3_temp_pass') ||
        Math.random().toString(36).substring(2, 15);

      localStorage.setItem('web3_temp_pass', tempPassword);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword
      });

      if (error) {
        console.log('Supabase sync not needed or failed:', error.message);
      }
    } catch (error) {
      console.error('Supabase sync error:', error);
    }
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.walletAddress = null;
    localStorage.removeItem('web3_auth_token');
    localStorage.removeItem('web3_wallet_address');
    localStorage.removeItem('web3_user_id');
  }

  isAuthenticated() {
    const token = localStorage.getItem('web3_auth_token');
    return !!token;
  }

  getWalletAddress() {
    return localStorage.getItem('web3_wallet_address');
  }

  getUserId() {
    return localStorage.getItem('web3_user_id');
  }
}

export async function createCustomWallet(password) {
  try {
    const wallet = ethers.Wallet.createRandom();

    const encryptedJson = await wallet.encrypt(password);

    localStorage.setItem('custom_wallet_encrypted', encryptedJson);
    localStorage.setItem('custom_wallet_address', wallet.address);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('custom_wallets')
        .insert([{
          user_id: user.id,
          encrypted_private_key: encryptedJson,
          wallet_address: wallet.address
        }]);

      if (error) {
        console.error('Error saving custom wallet:', error);
      }
    }

    return {
      address: wallet.address,
      mnemonic: wallet.mnemonic.phrase
    };
  } catch (error) {
    console.error('Custom wallet creation error:', error);
    throw error;
  }
}

export async function loadCustomWallet(password) {
  try {
    const encryptedJson = localStorage.getItem('custom_wallet_encrypted');

    if (!encryptedJson) {
      throw new Error('No custom wallet found');
    }

    const wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password);

    return wallet;
  } catch (error) {
    console.error('Custom wallet loading error:', error);
    throw error;
  }
}

export async function importWalletFromMnemonic(mnemonic, password) {
  try {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);

    const encryptedJson = await wallet.encrypt(password);

    localStorage.setItem('custom_wallet_encrypted', encryptedJson);
    localStorage.setItem('custom_wallet_address', wallet.address);

    return {
      address: wallet.address
    };
  } catch (error) {
    console.error('Wallet import error:', error);
    throw error;
  }
}

export function hasCustomWallet() {
  return !!localStorage.getItem('custom_wallet_encrypted');
}

export async function getWalletBalance(address, provider) {
  try {
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Balance fetch error:', error);
    return '0.0';
  }
}

export const web3AuthManager = new Web3AuthManager();
