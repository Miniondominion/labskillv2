-- Drop all existing policies for skill_logs
DO $$ 
BEGIN
  -- Drop policies only if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'skill_logs'
  ) THEN
    DROP POLICY IF EXISTS "skill_logs_insert_policy" ON skill_logs;
    DROP POLICY IF EXISTS "skill_logs_select_policy" ON skill_logs;
    DROP POLICY IF EXISTS "skill_logs_update_policy" ON skill_logs;
    DROP POLICY IF EXISTS "skill_logs_instructor_policy" ON skill_logs;
  END IF;
END $$;

-- Create new insert policy with simplified logic
CREATE POLICY "skill_logs_insert_policy"
  ON skill_logs
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() IN (student_id, evaluated_student_id)
  );

-- Create select policy
CREATE POLICY "skill_logs_select_policy"
  ON skill_logs
  FOR SELECT
  TO public
  USING (
    auth.uid() IN (student_id, evaluated_student_id) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skill_logs.student_id
      AND profiles.affiliated_instructor = auth.uid()
    )
  );

-- Create update policy
CREATE POLICY "skill_logs_update_policy"
  ON skill_logs
  FOR UPDATE
  TO public
  USING (
    (auth.uid() IN (student_id, evaluated_student_id)) AND
    status = 'submitted'
  );

-- Create instructor policy
CREATE POLICY "skill_logs_instructor_policy"
  ON skill_logs
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skill_logs.student_id
      AND profiles.affiliated_instructor = auth.uid()
    )
  );