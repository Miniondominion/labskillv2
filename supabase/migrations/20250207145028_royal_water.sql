-- Function to handle affiliation requests
CREATE OR REPLACE FUNCTION handle_affiliation_request(
  p_student_id UUID,
  p_instructor_code TEXT
)
RETURNS UUID AS $$
DECLARE
  v_instructor_id UUID;
BEGIN
  -- First verify the instructor code is valid
  SELECT id INTO v_instructor_id
  FROM profiles
  WHERE instructor_code = p_instructor_code
  AND role = 'instructor';

  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Invalid instructor code';
  END IF;

  -- Check if student already has an instructor affiliation
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_student_id
    AND affiliated_instructor IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Student is already affiliated with an instructor';
  END IF;

  -- Check for existing affiliation request
  IF EXISTS (
    SELECT 1 FROM affiliation_requests
    WHERE student_id = p_student_id
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Student already has a pending affiliation request';
  END IF;

  -- Create new affiliation request
  INSERT INTO affiliation_requests (
    student_id,
    instructor_id,
    status
  ) VALUES (
    p_student_id,
    v_instructor_id,
    'pending'
  )
  RETURNING id INTO v_instructor_id;

  RETURN v_instructor_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION handle_affiliation_request TO authenticated;