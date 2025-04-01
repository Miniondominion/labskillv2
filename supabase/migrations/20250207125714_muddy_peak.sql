-- Add class_id to skill_assignments table
ALTER TABLE skill_assignments 
ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_skill_assignments_class ON skill_assignments(class_id);

-- Update the skill assignments policies to include class-based access
DROP POLICY IF EXISTS "Instructors can view and manage assignments for their students" ON skill_assignments;

CREATE POLICY "Instructors can view and manage assignments for their students"
  ON skill_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_assignments.student_id
      AND p.affiliated_instructor = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = skill_assignments.class_id
      AND c.instructor_id = auth.uid()
    )
  );