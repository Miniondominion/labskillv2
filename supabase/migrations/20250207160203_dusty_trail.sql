-- Drop existing trigger and function
DROP TRIGGER IF EXISTS handle_affiliation_approval_trigger ON affiliation_requests;
DROP FUNCTION IF EXISTS handle_affiliation_approval();

-- Create improved function to handle affiliation approval
CREATE OR REPLACE FUNCTION handle_affiliation_approval()
RETURNS TRIGGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Only proceed if status is being changed to approved
  IF NEW.status = 'approved' THEN
    -- First verify the student exists and is actually a student
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = NEW.student_id
      AND role = 'student'
    ) THEN
      RAISE EXCEPTION 'Student not found or not a student';
    END IF;

    -- Verify the instructor exists and is actually an instructor
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = NEW.instructor_id
      AND role = 'instructor'
    ) THEN
      RAISE EXCEPTION 'Instructor not found or not an instructor';
    END IF;

    -- Begin transaction to ensure atomicity
    BEGIN
      -- Update the student's affiliated instructor
      UPDATE profiles
      SET 
        affiliated_instructor = NEW.instructor_id,
        updated_at = now()
      WHERE id = NEW.student_id
      AND role = 'student'
      RETURNING 1 INTO affected_rows;

      -- If no rows were updated, something went wrong
      IF affected_rows IS NULL OR affected_rows = 0 THEN
        RAISE EXCEPTION 'Failed to update student profile';
      END IF;

      -- Delete any other pending requests from this student
      DELETE FROM affiliation_requests
      WHERE student_id = NEW.student_id
      AND id != NEW.id
      AND status = 'pending';

      -- Return the updated record
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        -- Re-raise the error with more context
        RAISE EXCEPTION 'Failed to process affiliation request: %', SQLERRM;
    END;
  END IF;
  
  -- For non-approved status changes, just return the new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger for affiliation approval
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