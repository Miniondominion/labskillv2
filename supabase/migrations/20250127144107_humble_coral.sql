/*
  # Fix class enrollments status handling

  1. Changes
    - Remove status column from class_enrollments table
    - Remove status check constraint
    - Update policies to reflect the change
*/

-- First drop the status column if it exists
ALTER TABLE class_enrollments DROP COLUMN IF EXISTS status;

-- Drop and recreate policies without status checks
DROP POLICY IF EXISTS "Enrollments are viewable by class instructor" ON class_enrollments;
DROP POLICY IF EXISTS "Instructors can manage enrollments for their classes" ON class_enrollments;

-- Recreate policies
CREATE POLICY "Enrollments are viewable by class instructor"
  ON class_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage enrollments for their classes"
  ON class_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );