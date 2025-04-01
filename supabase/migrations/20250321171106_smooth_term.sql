/*
  # Fix skill_logs RLS policies

  1. Changes
    - Simplify and clarify insert policy logic
    - Ensure proper handling of both self-logs and peer evaluations
    - Fix policy evaluation order
    - Add explicit checks for student_id and evaluated_student_id

  2. Security
    - Maintain strict access control
    - Prevent unauthorized log creation
*/

-- Drop all existing policies for skill_logs
DO $$ 
BEGIN
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

-- Create new insert policy with explicit checks
CREATE POLICY "skill_logs_insert_policy"
  ON skill_logs
  FOR INSERT
  TO public
  WITH CHECK (
    CASE
      -- Self-log: User is creating their own log
      WHEN auth.uid() = student_id AND evaluated_student_id IS NULL THEN
        true
      -- Peer evaluation: User is evaluating another student
      WHEN auth.uid() = evaluated_student_id AND student_id IS NOT NULL THEN
        true
      ELSE
        false
    END
  );

-- Create select policy
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

-- Create update policy
CREATE POLICY "skill_logs_update_policy"
  ON skill_logs
  FOR UPDATE
  TO public
  USING (
    (auth.uid() = student_id AND status = 'submitted') OR
    (auth.uid() = evaluated_student_id AND status = 'submitted')
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