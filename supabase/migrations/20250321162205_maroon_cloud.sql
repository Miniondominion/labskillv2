/*
  # Fix skill_logs RLS policies

  1. Changes
    - Drop existing policies
    - Add new policies for:
      - Students creating their own logs
      - Students creating peer evaluations
      - Students viewing their own logs
      - Instructors viewing and managing logs
    
  2. Security
    - Students can only create logs for themselves or as peer evaluators
    - Students can only view logs they created or received
    - Instructors can view and manage logs for their students
*/

-- First check and drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies only if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'skill_logs' 
    AND policyname = 'Students can create their own logs'
  ) THEN
    DROP POLICY "Students can create their own logs" ON skill_logs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'skill_logs' 
    AND policyname = 'Students can view their own logs'
  ) THEN
    DROP POLICY "Students can view their own logs" ON skill_logs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'skill_logs' 
    AND policyname = 'Students can update their pending logs'
  ) THEN
    DROP POLICY "Students can update their pending logs" ON skill_logs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'skill_logs' 
    AND policyname = 'Instructors can view and manage logs'
  ) THEN
    DROP POLICY "Instructors can view and manage logs" ON skill_logs;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "Students can create their own logs"
  ON skill_logs
  FOR INSERT
  TO public
  WITH CHECK (
    (student_id = auth.uid() AND evaluated_student_id IS NULL) OR
    (student_id IS NOT NULL AND evaluated_student_id = auth.uid())
  );

CREATE POLICY "Students can view their own logs"
  ON skill_logs
  FOR SELECT
  TO public
  USING (
    student_id = auth.uid() OR
    evaluated_student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = skill_logs.student_id
      AND affiliated_instructor = auth.uid()
    )
  );

CREATE POLICY "Students can update their pending logs"
  ON skill_logs
  FOR UPDATE
  TO public
  USING (
    (student_id = auth.uid() AND status = 'submitted') OR
    (evaluated_student_id = auth.uid() AND status = 'submitted')
  );

CREATE POLICY "Instructors can view and manage logs"
  ON skill_logs
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = skill_logs.student_id
      AND affiliated_instructor = auth.uid()
    )
  );