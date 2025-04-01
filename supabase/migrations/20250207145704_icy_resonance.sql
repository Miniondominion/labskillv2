-- Drop existing unique constraint first
ALTER TABLE affiliation_requests 
DROP CONSTRAINT IF EXISTS affiliation_requests_student_id_instructor_id_key;

-- Drop existing index if it exists
DROP INDEX IF EXISTS affiliation_requests_student_pending_unique;

-- Create new unique constraint for pending requests per student
CREATE UNIQUE INDEX affiliation_requests_student_pending_unique
ON affiliation_requests (student_id)
WHERE status = 'pending';

-- Create function to handle affiliation requests
CREATE OR REPLACE FUNCTION handle_affiliation_request(
  p_student_id UUID,
  p_instructor_code TEXT
)
RETURNS UUID AS $$
DECLARE
  v_instructor_id UUID;
  v_request_id UUID;
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

  -- Use transaction to handle race conditions
  BEGIN
    -- Check for existing pending request
    IF EXISTS (
      SELECT 1 FROM affiliation_requests
      WHERE student_id = p_student_id
      AND status = 'pending'
      FOR UPDATE SKIP LOCKED
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
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Student already has a pending affiliation request';
  END;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION handle_affiliation_request TO authenticated;

-- Update policies to be more restrictive
DROP POLICY IF EXISTS "Students can create pending requests" ON affiliation_requests;
CREATE POLICY "Students can create pending requests"
  ON affiliation_requests
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid() AND
    status = 'pending' AND
    NOT EXISTS (
      SELECT 1 FROM affiliation_requests
      WHERE student_id = auth.uid()
      AND status = 'pending'
    )
  );