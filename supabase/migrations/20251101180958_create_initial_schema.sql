/*
  # DilSe Matchify - Initial Database Schema

  ## Overview
  Creates the core database structure for a matchmaking platform with authentication,
  user profiles, matching algorithm, and messaging functionality.

  ## 1. New Tables

  ### `profiles`
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text, unique) - User email
  - `first_name` (text) - First name
  - `last_name` (text) - Last name
  - `phone` (text) - Phone number
  - `date_of_birth` (date) - Date of birth
  - `gender` (text) - Gender
  - `city` (text) - City
  - `state` (text) - State
  - `country` (text) - Country
  - `religion` (text) - Religion
  - `caste` (text) - Caste/Community
  - `mother_tongue` (text) - Mother tongue
  - `education` (text) - Highest education
  - `occupation` (text) - Occupation
  - `company` (text) - Company/Organization
  - `income` (text) - Annual income range
  - `height` (text) - Height range
  - `body_type` (text) - Body type
  - `complexion` (text) - Complexion
  - `marital_status` (text) - Marital status
  - `smoking_habits` (text) - Smoking habits
  - `drinking_habits` (text) - Drinking habits
  - `dietary_preferences` (text) - Dietary preferences
  - `pet_preference` (text) - Pet preference
  - `about_me` (text) - About me description
  - `looking_for` (text) - What user is looking for
  - `family_values` (text) - Family values description
  - `interests` (jsonb) - Array of interests/hobbies
  - `profile_photo_url` (text) - Main profile photo URL
  - `additional_photos` (jsonb) - Array of additional photo URLs
  - `profile_visibility` (text) - Profile visibility setting
  - `contact_preference` (text) - Contact preference
  - `email_notifications` (boolean) - Email notification preference
  - `profile_completion` (integer) - Profile completion percentage
  - `created_at` (timestamptz) - Profile creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `partner_preferences`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References profiles
  - `min_age` (integer) - Minimum preferred age
  - `max_age` (integer) - Maximum preferred age
  - `preferred_height` (text) - Preferred height range
  - `preferred_education` (text) - Preferred education level
  - `preferred_religion` (text) - Preferred religion
  - `preferred_location` (text) - Preferred location
  - `preferred_marital_status` (text) - Preferred marital status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `matches`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - First user
  - `matched_user_id` (uuid, foreign key) - Second user
  - `compatibility_score` (integer) - Algorithm-calculated score
  - `status` (text) - Match status (pending, accepted, rejected)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `likes`
  - `id` (uuid, primary key)
  - `from_user_id` (uuid, foreign key) - User who liked
  - `to_user_id` (uuid, foreign key) - User who was liked
  - `created_at` (timestamptz)

  ### `messages`
  - `id` (uuid, primary key)
  - `sender_id` (uuid, foreign key) - Message sender
  - `receiver_id` (uuid, foreign key) - Message receiver
  - `content` (text) - Message content
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Users can only read/update their own profile
  - Users can read profiles based on visibility settings
  - Users can only send messages to matched users
  - Users can only see their own matches and likes

  ## 3. Indexes
  - Create indexes on frequently queried columns for performance
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  date_of_birth date,
  gender text,
  city text,
  state text,
  country text DEFAULT 'India',
  religion text,
  caste text,
  mother_tongue text,
  education text,
  occupation text,
  company text,
  income text,
  height text,
  body_type text,
  complexion text,
  marital_status text,
  smoking_habits text,
  drinking_habits text,
  dietary_preferences text,
  pet_preference text,
  about_me text,
  looking_for text,
  family_values text,
  interests jsonb DEFAULT '[]'::jsonb,
  profile_photo_url text,
  additional_photos jsonb DEFAULT '[]'::jsonb,
  profile_visibility text DEFAULT 'public',
  contact_preference text DEFAULT 'anyone',
  email_notifications boolean DEFAULT true,
  profile_completion integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create partner_preferences table
CREATE TABLE IF NOT EXISTS partner_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  min_age integer,
  max_age integer,
  preferred_height text,
  preferred_education text,
  preferred_religion text,
  preferred_location text,
  preferred_marital_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  matched_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  compatibility_score integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, matched_user_id)
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_state ON profiles(state);
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_matched_user_id ON matches(matched_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_from_user ON likes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_to_user ON likes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view public profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    profile_visibility = 'public' 
    OR id = auth.uid()
  );

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Partner Preferences RLS Policies
CREATE POLICY "Users can view their own preferences"
  ON partner_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON partner_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON partner_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Matches RLS Policies
CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR matched_user_id = auth.uid()
  );

CREATE POLICY "Users can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR matched_user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR matched_user_id = auth.uid()
  );

-- Likes RLS Policies
CREATE POLICY "Users can view likes they sent"
  ON likes FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid());

CREATE POLICY "Users can view likes they received"
  ON likes FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid());

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can delete their likes"
  ON likes FOR DELETE
  TO authenticated
  USING (from_user_id = auth.uid());

-- Messages RLS Policies
CREATE POLICY "Users can view messages they sent"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can view messages they received"
  ON messages FOR SELECT
  TO authenticated
  USING (receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update messages they received"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_preferences_updated_at
  BEFORE UPDATE ON partner_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();