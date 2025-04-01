/*
  # Assign Instructor Codes to Existing Instructors

  1. Changes
    - Assigns instructor codes to all existing instructor profiles that don't have one
  
  2. Security
    - Uses existing RLS policies
    - Only affects instructor profiles
*/

-- Assign instructor codes to existing instructors
DO $$ 
DECLARE
  instructor_record RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Loop through all instructors without a code
  FOR instructor_record IN 
    SELECT id 
    FROM profiles 
    WHERE role = 'instructor' 
    AND instructor_code IS NULL
  LOOP
    -- Generate unique code
    LOOP
      -- Generate a new code
      SELECT generate_instructor_code() INTO new_code;
      
      -- Check if code exists
      SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE instructor_code = new_code
      ) INTO code_exists;
      
      -- Exit loop if unique code found
      EXIT WHEN NOT code_exists;
    END LOOP;

    -- Update the instructor with the new code
    UPDATE profiles 
    SET instructor_code = new_code 
    WHERE id = instructor_record.id;
  END LOOP;
END $$;