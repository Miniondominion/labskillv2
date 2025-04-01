/*
  # Fix Skill Assignments Schema

  1. Changes
    - Add missing indexes and constraints
    - Update policies for better access control
*/

-- Add missing indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'skill_assignments' 
    AND indexname = 'idx_skill_assignments_instructor'
  ) THEN
    CREATE INDEX idx_skill_assignments_instructor ON skill_assignments(student_id);
  END IF;
END $$;

-- Update policies to ensure proper access
DROP POLICY IF EXISTS "Instructors can view and manage assignments for their students" ON skill_assignments;

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

-- Add admin access policy
CREATE POLICY "Admins can manage all assignments"
  ON skill_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );