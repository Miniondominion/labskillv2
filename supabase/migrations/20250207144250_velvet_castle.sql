-- Drop existing unique constraint if it exists
DROP INDEX IF EXISTS affiliation_requests_student_pending_unique;

-- Create new unique constraint for pending requests
CREATE UNIQUE INDEX affiliation_requests_student_pending_unique
ON affiliation_requests (student_id)
WHERE status = 'pending';

-- Update the students policy to prevent duplicate pending requests
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

-- Create function to check for existing requests
CREATE OR REPLACE FUNCTION check_existing_affiliation_request(p_student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM affiliation_requests
    WHERE student_id = p_student_id
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql;