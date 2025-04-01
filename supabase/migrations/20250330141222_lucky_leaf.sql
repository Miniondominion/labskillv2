/*
  # Fix Skill Submissions RLS Policies

  1. Changes
    - Drop existing policies
    - Add new policies for:
      - Students submitting their own logs
      - Students submitting peer evaluations
      - Instructors viewing their students' submissions
    
  2. Security
    - Ensure proper access control
    - Allow both self-logs and peer evaluations
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'skill_submissions'
  ) THEN
    DROP POLICY IF EXISTS "Students can view their own skill submissions" ON skill_submissions;
    DROP POLICY IF EXISTS "Instructors can view their students' skill submissions" ON skill_submissions;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "skill_submissions_insert_policy"
  ON skill_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "skill_submissions_select_policy"
  ON skill_submissions
  FOR SELECT
  TO public
  USING (
    -- Students can view their own submissions
    student_id = auth.uid() OR
    -- Instructors can view their students' submissions
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = skill_submissions.student_id
      AND affiliated_instructor = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skill_submissions_student ON skill_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_skill_submissions_skill ON skill_submissions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_submissions_status ON skill_submissions(status);