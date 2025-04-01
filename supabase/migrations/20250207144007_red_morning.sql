-- Add unique constraint to prevent multiple pending requests per student
ALTER TABLE affiliation_requests
DROP CONSTRAINT IF EXISTS affiliation_requests_student_pending_unique;

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