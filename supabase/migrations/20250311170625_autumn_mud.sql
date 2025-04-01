/*
  # Update Student Affiliations

  1. Changes
    - Updates all students with null affiliated_instructor to use instructor code "HB-J66M"
    
  2. Safety
    - Only updates students with null affiliated_instructor
    - Only updates students with role = 'student'
    - Uses a DO block for safe execution
*/

DO $$ 
DECLARE
  v_instructor_id uuid;
BEGIN
  -- First get the instructor ID from the code
  SELECT id INTO v_instructor_id
  FROM profiles
  WHERE instructor_code = 'HB-J66M'
  AND role = 'instructor'
  LIMIT 1;

  -- Only proceed if we found the instructor
  IF v_instructor_id IS NOT NULL THEN
    -- Update all students with null affiliated_instructor
    UPDATE profiles
    SET affiliated_instructor = v_instructor_id
    WHERE role = 'student'
    AND affiliated_instructor IS NULL;
  END IF;
END $$;