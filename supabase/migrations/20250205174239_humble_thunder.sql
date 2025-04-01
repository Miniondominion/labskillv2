/*
  # Fix profiles instructor foreign key relationship

  1. Changes
    - Drop existing instructor_id foreign key if it exists
    - Recreate instructor_id foreign key with proper self-referential relationship
    - Add explicit foreign key name for better error messages
*/

-- First drop the existing foreign key if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_instructor_id_fkey'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_instructor_id_fkey;
  END IF;
END $$;

-- Recreate the foreign key with explicit naming
ALTER TABLE profiles
ADD CONSTRAINT profiles_instructor_id_fkey 
FOREIGN KEY (instructor_id) 
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_instructor_id 
ON profiles(instructor_id);