/*
  # Fix skill assignments schema

  1. Changes
    - Add missing columns to skill_assignments table
    - Update existing policies
    - Add indexes for performance

  2. Security
    - Maintain RLS policies
    - Ensure proper access control
*/

-- First ensure the skill_assignments table has all required columns
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_assignments' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE skill_assignments 
    ADD COLUMN status skill_assignment_status NOT NULL DEFAULT 'pending';
  END IF;

  -- Add required_submissions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_assignments' 
    AND column_name = 'required_submissions'
  ) THEN
    ALTER TABLE skill_assignments 
    ADD COLUMN required_submissions INTEGER NOT NULL DEFAULT 1;
  END IF;

  -- Add check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'skill_assignments_required_submissions_check'
  ) THEN
    ALTER TABLE skill_assignments 
    ADD CONSTRAINT skill_assignments_required_submissions_check 
    CHECK (required_submissions > 0);
  END IF;
END $$;

-- Ensure all required indexes exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'skill_assignments' 
    AND indexname = 'idx_skill_assignments_status'
  ) THEN
    CREATE INDEX idx_skill_assignments_status 
    ON skill_assignments(status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'skill_assignments' 
    AND indexname = 'idx_skill_assignments_required_submissions'
  ) THEN
    CREATE INDEX idx_skill_assignments_required_submissions 
    ON skill_assignments(required_submissions);
  END IF;
END $$;

-- Update policies to ensure proper access
DROP POLICY IF EXISTS "Students can view their own assignments" ON skill_assignments;
DROP POLICY IF EXISTS "Instructors can view and manage assignments for their students" ON skill_assignments;
DROP POLICY IF EXISTS "Admins can manage all assignments" ON skill_assignments;

-- Recreate policies with proper access controls
CREATE POLICY "Students can view their own assignments"
  ON skill_assignments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Instructors can view and manage assignments for their students"
  ON skill_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_assignments.student_id
      AND p.instructor_id = auth.uid()
      AND (
        SELECT role FROM profiles 
        WHERE id = auth.uid()
      ) = 'instructor'
    )
  );

CREATE POLICY "Admins can manage all assignments"
  ON skill_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );