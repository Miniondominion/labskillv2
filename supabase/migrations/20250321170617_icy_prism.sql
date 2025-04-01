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
    -- For self-logs: user must be the student and no evaluated_student_id
    (auth.uid() = student_id AND evaluated_student_id IS NULL) OR
    -- For peer evaluations: user must be the evaluator and student_id must be set
    (auth.uid() = evaluated_student_id AND student_id IS NOT NULL)
  );

-- Create select policy
CREATE POLICY "skill_logs_select_policy"
  ON skill_logs
  FOR SELECT
  TO public
  USING (
    -- Students can view logs about themselves
    auth.uid() = student_id OR
    -- Students can view logs they evaluated
    auth.uid() = evaluated_student_id OR
    -- Instructors can view their students' logs
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
    -- Students can update their own submitted logs
    (auth.uid() = student_id AND status = 'submitted') OR
    -- Students can update logs they're evaluating
    (auth.uid() = evaluated_student_id AND status = 'submitted')
  );

-- Create instructor policy
CREATE POLICY "skill_logs_instructor_policy"
  ON skill_logs
  FOR ALL
  TO public
  USING (
    -- Instructors can manage their students' logs
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = skill_logs.student_id
      AND profiles.affiliated_instructor = auth.uid()
    )
  );