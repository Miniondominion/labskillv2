-- Drop existing policies
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

-- Create new insert policy with fixed logic
CREATE POLICY "skill_logs_insert_policy"
  ON skill_logs
  FOR INSERT
  TO public
  WITH CHECK (
    ((auth.uid() = student_id AND evaluated_student_id IS NULL) OR 
    (auth.uid() = evaluated_student_id AND student_id IS NOT NULL))
  );

-- Recreate other policies
CREATE POLICY "skill_logs_select_policy"
  ON skill_logs
  FOR SELECT
  TO public
  USING (
    auth.uid() = student_id OR
    auth.uid() = evaluated_student_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skill_logs.student_id
      AND profiles.affiliated_instructor = auth.uid()
    )
  );

CREATE POLICY "skill_logs_update_policy"
  ON skill_logs
  FOR UPDATE
  TO public
  USING (
    (auth.uid() = student_id AND status = 'submitted') OR
    (auth.uid() = evaluated_student_id AND status = 'submitted')
  );

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