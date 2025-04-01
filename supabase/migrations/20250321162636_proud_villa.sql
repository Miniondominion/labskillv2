/*
  # Fix skill_logs RLS policies

  1. Changes
    - Drop all existing policies
    - Create new policies with proper checks for:
      - Student self-logs
      - Peer evaluations
      - Instructor access
    
  2. Security
    - Maintain proper access control
    - Allow both self-logs and peer evaluations
    - Ensure instructors can manage their students' logs
*/

-- Drop all existing policies for skill_logs
DROP POLICY IF EXISTS "Students can create their own logs" ON skill_logs;
DROP POLICY IF EXISTS "Students can create logs" ON skill_logs;
DROP POLICY IF EXISTS "Students can view their own logs" ON skill_logs;
DROP POLICY IF EXISTS "Students can update their pending logs" ON skill_logs;
DROP POLICY IF EXISTS "Instructors can view and manage logs" ON skill_logs;
DROP POLICY IF EXISTS "Instructors can manage logs" ON skill_logs;

-- Create new policies with proper checks
CREATE POLICY "Students can create logs"
  ON skill_logs
  FOR INSERT
  TO public
  WITH CHECK (
    -- Allow students to create logs for themselves
    (student_id = auth.uid() AND evaluated_student_id IS NULL) OR
    -- Allow students to create peer evaluation logs
    (evaluated_student_id = auth.uid() AND student_id IS NOT NULL)
  );

CREATE POLICY "Students can view their own logs"
  ON skill_logs
  FOR SELECT
  TO public
  USING (
    -- Students can view logs they created
    student_id = auth.uid() OR
    -- Students can view logs where they were evaluated
    evaluated_student_id = auth.uid() OR
    -- Instructors can view their students' logs
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = skill_logs.student_id
      AND affiliated_instructor = auth.uid()
    )
  );

CREATE POLICY "Students can update their own logs"
  ON skill_logs
  FOR UPDATE
  TO public
  USING (
    -- Students can update their own logs
    (student_id = auth.uid() AND status = 'submitted') OR
    -- Students can update logs they're evaluating
    (evaluated_student_id = auth.uid() AND status = 'submitted')
  );

CREATE POLICY "Instructors can manage student logs"
  ON skill_logs
  FOR ALL
  TO public
  USING (
    -- Instructors can manage logs for their affiliated students
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = skill_logs.student_id
      AND affiliated_instructor = auth.uid()
    )
  );