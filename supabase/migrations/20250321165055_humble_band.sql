-- First check and drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies only if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'skill_logs'
  ) THEN
    DROP POLICY IF EXISTS "Students can create their own logs" ON skill_logs;
    DROP POLICY IF EXISTS "Students can create logs" ON skill_logs;
    DROP POLICY IF EXISTS "Students can view their own logs" ON skill_logs;
    DROP POLICY IF EXISTS "Students can view logs" ON skill_logs;
    DROP POLICY IF EXISTS "Students can update their pending logs" ON skill_logs;
    DROP POLICY IF EXISTS "Students can update their own logs" ON skill_logs;
    DROP POLICY IF EXISTS "Students can update logs" ON skill_logs;
    DROP POLICY IF EXISTS "Instructors can view and manage logs" ON skill_logs;
    DROP POLICY IF EXISTS "Instructors can manage logs" ON skill_logs;
    DROP POLICY IF EXISTS "Instructors can manage student logs" ON skill_logs;
    DROP POLICY IF EXISTS "Users can view their own logs and instructors can view their cl" ON skill_logs;
  END IF;
END $$;

-- Create new streamlined policies with unique names
CREATE POLICY "skill_logs_insert_policy"
  ON skill_logs
  FOR INSERT
  TO public
  WITH CHECK (
    -- Students can log their own skills
    (auth.uid() = student_id AND evaluated_student_id IS NULL) OR
    -- Students can create peer evaluations
    (auth.uid() = evaluated_student_id AND student_id IS NOT NULL)
  );

CREATE POLICY "skill_logs_select_policy"
  ON skill_logs
  FOR SELECT
  TO public
  USING (
    -- Students can view their own logs
    auth.uid() = student_id OR
    -- Students can view logs where they were the evaluator
    auth.uid() = evaluated_student_id OR
    -- Instructors can view their students' logs
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
    -- Students can update their own submitted logs
    (auth.uid() = student_id AND status = 'submitted') OR
    -- Students can update logs they're evaluating
    (auth.uid() = evaluated_student_id AND status = 'submitted')
  );

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