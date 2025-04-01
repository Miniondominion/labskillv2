/*
  # Fix trigger function to use affiliated_instructor

  Updates the check_instructor_role trigger function to use the new column name.

  1. Changes
    - Update trigger function to use affiliated_instructor instead of instructor_id
    
  2. Security
    - Maintains existing role validation logic
*/

-- Drop and recreate the function with updated column name
CREATE OR REPLACE FUNCTION check_instructor_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL affiliated_instructor
  IF NEW.affiliated_instructor IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if the referenced instructor has the instructor role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.affiliated_instructor
    AND role = 'instructor'
  ) THEN
    RAISE EXCEPTION 'Referenced affiliated_instructor must belong to a user with instructor role';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_instructor_role ON profiles;

-- Recreate trigger with updated function
CREATE TRIGGER enforce_instructor_role
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_instructor_role();