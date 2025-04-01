-- Drop existing trigger and function
DROP TRIGGER IF EXISTS handle_affiliation_approval_trigger ON affiliation_requests;
DROP FUNCTION IF EXISTS handle_affiliation_approval();

-- Create improved function to handle affiliation approval
CREATE OR REPLACE FUNCTION handle_affiliation_approval()
RETURNS TRIGGER
SECURITY DEFINER -- Add security definer to bypass RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows INTEGER;
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
    RETURNING 1 INTO affected_rows;

    -- Verify the update was successful
    IF affected_rows IS NULL OR affected_rows = 0 THEN
      RAISE EXCEPTION 'Failed to update student profile';
    END IF;

    -- Delete any other pending requests from this student
    DELETE FROM affiliation_requests
    WHERE student_id = NEW.student_id
    AND id != NEW.id
    AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for affiliation approval
CREATE TRIGGER handle_affiliation_approval_trigger
  BEFORE UPDATE ON affiliation_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_affiliation_approval();

-- Ensure proper RLS policies exist
DROP POLICY IF EXISTS "Instructors can update request status" ON affiliation_requests;
CREATE POLICY "Instructors can update request status"
  ON affiliation_requests
  FOR UPDATE
  USING (instructor_id = auth.uid())
  WITH CHECK (status IN ('approved', 'rejected'));

-- Grant necessary permissions
GRANT UPDATE ON profiles TO authenticated;