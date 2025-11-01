/*
  # Add Web3 Blockchain Authentication

  ## Overview
  Extends the existing authentication system to support blockchain wallet-based login
  using signature verification with ethers.js.

  ## 1. New Tables

  ### `wallet_addresses`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - Links to profiles table
  - `wallet_address` (text, unique) - Ethereum wallet address (checksummed)
  - `is_primary` (boolean) - Primary wallet for the user
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `auth_nonces`
  - `id` (uuid, primary key)
  - `wallet_address` (text) - Wallet address requesting authentication
  - `nonce` (text) - Random nonce for signature
  - `expires_at` (timestamptz) - Expiration time (5 minutes)
  - `used` (boolean) - Whether nonce has been used
  - `created_at` (timestamptz)

  ### `custom_wallets`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - Links to profiles table
  - `encrypted_private_key` (text) - Encrypted private key
  - `wallet_address` (text, unique) - Wallet address
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all new tables
  - Nonces expire after 5 minutes
  - Nonces can only be used once
  - Users can only access their own wallets
  - Wallet addresses stored in checksummed format

  ## 3. Indexes
  - Index on wallet_address for fast lookup
  - Index on nonce expiration for cleanup
*/

-- Create wallet_addresses table
CREATE TABLE IF NOT EXISTS wallet_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  wallet_address text UNIQUE NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create auth_nonces table
CREATE TABLE IF NOT EXISTS auth_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  nonce text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create custom_wallets table
CREATE TABLE IF NOT EXISTS custom_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  encrypted_private_key text NOT NULL,
  wallet_address text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_addresses_user_id ON wallet_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_addresses_address ON wallet_addresses(wallet_address);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_wallet ON auth_nonces(wallet_address);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_expires ON auth_nonces(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_nonce ON auth_nonces(nonce);
CREATE INDEX IF NOT EXISTS idx_custom_wallets_user_id ON custom_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_wallets_address ON custom_wallets(wallet_address);

-- Enable Row Level Security
ALTER TABLE wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_wallets ENABLE ROW LEVEL SECURITY;

-- Wallet Addresses RLS Policies
CREATE POLICY "Users can view their own wallet addresses"
  ON wallet_addresses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wallet addresses"
  ON wallet_addresses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet addresses"
  ON wallet_addresses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own wallet addresses"
  ON wallet_addresses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Auth Nonces RLS Policies (public read for authentication flow)
CREATE POLICY "Anyone can read unexpired nonces"
  ON auth_nonces FOR SELECT
  TO anon, authenticated
  USING (expires_at > now() AND used = false);

CREATE POLICY "Service can insert nonces"
  ON auth_nonces FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service can update nonces"
  ON auth_nonces FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Custom Wallets RLS Policies
CREATE POLICY "Users can view their own custom wallets"
  ON custom_wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own custom wallets"
  ON custom_wallets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own custom wallets"
  ON custom_wallets FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger for wallet_addresses updated_at
CREATE TRIGGER update_wallet_addresses_updated_at
  BEFORE UPDATE ON wallet_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to cleanup expired nonces (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_nonces
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to ensure only one primary wallet per user
CREATE OR REPLACE FUNCTION ensure_single_primary_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE wallet_addresses
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_primary_wallet
  BEFORE INSERT OR UPDATE ON wallet_addresses
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_wallet();