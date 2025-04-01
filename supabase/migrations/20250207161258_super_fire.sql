-- Drop existing trigger and function
DROP TRIGGER IF EXISTS handle_affiliation_approval_trigger ON affiliation_requests;
DROP FUNCTION IF EXISTS handle_affiliation_approval();

-- Create improved function to handle affiliation approval
CREATE OR REPLACE FUNCTION handle_affiliation_approval()
RETURNS TRIGGER AS $$
DECLARE
  student_profile RECORD;
BEGIN
  -- Only proceed if status is being changed to approved
  IF NEW.status = 'approved' THEN
    -- First get the student's current profile state
    SELECT * INTO student_profile
    FROM profiles
    WHERE id = NEW.student_id
    AND role = 'student'
    FOR UPDATE;

    -- Verify student exists and is a student
    IF student_profile IS NULL THEN
      RAISE EXCEPTION 'Student not found or not a student';
    END IF;

    -- Verify student is not already affiliated
    IF student_profile.affiliated_instructor IS NOT NULL THEN
      RAISE EXCEPTION 'Student is already affiliated with an instructor';
    END IF;

    -- Update the student's affiliated instructor
    UPDATE profiles
    SET 
      affiliated_instructor = NEW.instructor_id,
      updated_at = now()
    WHERE id = NEW.student_id
    AND role = 'student'
    AND affiliated_instructor IS NULL;

    -- Verify the update was successful
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update student affiliation';
    END IF;

    -- Delete any other pending requests from this student
    DELETE FROM affiliation_requests
    WHERE student_id = NEW.student_id
    AND id != NEW.id
    AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for affiliation approval
CREATE TRIGGER handle_affiliation_approval_trigger
  BEFORE UPDATE ON affiliation_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_affiliation_approval();

-- Add policy for instructors to approve/reject requests
DROP POLICY IF EXISTS "Instructors can update request status" ON affiliation_requests;
CREATE POLICY "Instructors can update request status"
  ON affiliation_requests
  FOR UPDATE
  USING (instructor_id = auth.uid())
  WITH CHECK (status IN ('approved', 'rejected'));