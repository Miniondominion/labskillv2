/*
  # Fix skill_logs RLS policies

  1. Changes
    - Drop all existing policies
    - Create new simplified policies that properly handle:
      - Student self-logs
      - Peer evaluations
      - Instructor access
    
  2. Security
    - Maintain proper access control
    - Fix permission issues for log creation
*/

-- Drop all existing policies for skill_logs
DROP POLICY IF EXISTS "Students can create their own logs" ON skill_logs;
DROP POLICY IF EXISTS "Students can create logs" ON skill_logs;
DROP POLICY IF EXISTS "Students can view their own logs" ON skill_logs;
DROP POLICY IF EXISTS "Students can update their pending logs" ON skill_logs;
DROP POLICY IF EXISTS "Students can update their own logs" ON skill_logs;
DROP POLICY IF EXISTS "Instructors can view and manage logs" ON skill_logs;
DROP POLICY IF EXISTS "Instructors can manage logs" ON skill_logs;
DROP POLICY IF EXISTS "Instructors can manage student logs" ON skill_logs;
DROP POLICY IF EXISTS "Users can view their own logs and instructors can view their cl" ON skill_logs;

-- Create new streamlined policies
CREATE POLICY "Students can create logs"
  ON skill_logs
  FOR INSERT
  TO public
  WITH CHECK (
    -- Students can log their own skills
    (auth.uid() = student_id AND evaluated_student_id IS NULL) OR
    -- Students can create peer evaluations
    (auth.uid() = evaluated_student_id AND student_id IS NOT NULL)
  );

CREATE POLICY "Students can view logs"
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

CREATE POLICY "Students can update logs"
  ON skill_logs
  FOR UPDATE
  TO public
  USING (
    -- Students can update their own submitted logs
    (auth.uid() = student_id AND status = 'submitted') OR
    -- Students can update logs they're evaluating
    (auth.uid() = evaluated_student_id AND status = 'submitted')
  );

CREATE POLICY "Instructors can manage logs"
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