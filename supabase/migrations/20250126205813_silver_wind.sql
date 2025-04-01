/*
  # Add instructor relationship to profiles

  1. Changes
    - Add instructor_id column to profiles table
    - Add foreign key constraint referencing profiles table
    - Add index for better query performance
    - Add trigger to ensure instructor_id only references instructors
  
  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
    - Added trigger-based validation for instructor role
*/

-- Add instructor_id column with foreign key constraint
ALTER TABLE profiles
ADD COLUMN instructor_id UUID REFERENCES profiles(id);

-- Add index for better query performance
CREATE INDEX idx_profiles_instructor ON profiles(instructor_id);

-- Create function to validate instructor role
CREATE OR REPLACE FUNCTION check_instructor_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL instructor_id
  IF NEW.instructor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if the referenced instructor has the instructor role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.instructor_id
    AND role = 'instructor'
  ) THEN
    RAISE EXCEPTION 'Referenced instructor_id must belong to a user with instructor role';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce instructor role check
CREATE TRIGGER enforce_instructor_role
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_instructor_role();