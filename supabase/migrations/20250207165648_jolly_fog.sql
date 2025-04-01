-- Drop existing function if it exists
DROP FUNCTION IF EXISTS remove_student_affiliation(UUID, UUID);
DROP FUNCTION IF EXISTS remove_student_affiliation(UUID, UUID, UUID[]);

-- Create new function with more specific name
CREATE OR REPLACE FUNCTION remove_student_instructor_affiliation(
  p_student_id UUID,
  p_instructor_id UUID
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Verify the student is actually affiliated with this instructor
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_student_id
    AND affiliated_instructor = p_instructor_id
    AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Student is not affiliated with this instructor';
  END IF;

  -- Remove instructor affiliation
  UPDATE profiles
  SET 
    affiliated_instructor = NULL,
    updated_at = now()
  WHERE id = p_student_id
  AND affiliated_instructor = p_instructor_id
  AND role = 'student'
  RETURNING 1 INTO affected_rows;

  -- Verify the update was successful
  IF affected_rows IS NULL OR affected_rows = 0 THEN
    RAISE EXCEPTION 'Failed to remove instructor affiliation';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remove_student_instructor_affiliation TO authenticated;