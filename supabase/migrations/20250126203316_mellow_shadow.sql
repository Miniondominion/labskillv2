/*
  # Fix profiles RLS policies

  1. Changes
    - Add policy to allow profile creation during signup
    - Modify existing policies for better security

  2. Security
    - Enable RLS on profiles table
    - Add policies for:
      - Public read access
      - Self profile creation
      - Self profile updates
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);