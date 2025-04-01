-- Create function to safely delete a user and all related data
CREATE OR REPLACE FUNCTION delete_user_cascade(user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete skill logs first
  DELETE FROM skill_logs
  WHERE student_id = user_id;

  -- Delete skill assignments
  DELETE FROM skill_assignments
  WHERE student_id = user_id;

  -- Delete class enrollments
  DELETE FROM class_enrollments
  WHERE student_id = user_id;

  -- Delete affiliation requests
  DELETE FROM affiliation_requests
  WHERE student_id = user_id;

  -- Delete profile
  DELETE FROM profiles
  WHERE id = user_id;

  -- Delete auth.user
  DELETE FROM auth.users
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_cascade TO authenticated;

-- Add RLS policy to ensure only admins can execute this function
CREATE POLICY "Only admins can delete users"
  ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );