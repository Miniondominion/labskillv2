-- Create a simpler version of the affiliation approval function
-- This version avoids complex transactions and nested blocks that might cause excessive database operations

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS handle_affiliation_approval_trigger ON affiliation_requests;
DROP FUNCTION IF EXISTS handle_affiliation_approval();

-- Create simplified function to handle affiliation approval
CREATE OR REPLACE FUNCTION handle_affiliation_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is being changed to approved
  IF NEW.status = 'approved' THEN
    -- Update the student's affiliated instructor
    UPDATE profiles
    SET 
      affiliated_instructor = NEW.instructor_id,
      updated_at = now()
    WHERE id = NEW.student_id
    AND role = 'student'
    AND affiliated_instructor IS NULL;

    -- Delete any other pending requests from this student
    DELETE FROM affiliation_requests
    WHERE student_id = NEW.student_id
    AND id != NEW.id
    AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger for affiliation approval
CREATE TRIGGER handle_affiliation_approval_trigger
  AFTER UPDATE ON affiliation_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_affiliation_approval();

-- Add policy for instructors to approve/reject requests
DROP POLICY IF EXISTS "Instructors can update request status" ON affiliation_requests;
CREATE POLICY "Instructors can update request status"
  ON affiliation_requests
  FOR UPDATE
  USING (instructor_id = auth.uid())
  WITH CHECK (
    instructor_id = auth.uid() AND
    status IN ('approved', 'rejected')
  );

-- Add policy to prevent updates to already processed requests
DROP POLICY IF EXISTS "Can only update pending requests" ON affiliation_requests;
CREATE POLICY "Can only update pending requests"
  ON affiliation_requests
  FOR UPDATE
  USING (status = 'pending');