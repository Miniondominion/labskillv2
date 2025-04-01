-- First drop all existing policies
DROP POLICY IF EXISTS "Students can create entries" ON clinical_entries;
DROP POLICY IF EXISTS "Students can view their own entries" ON clinical_entries;
DROP POLICY IF EXISTS "Instructors can view their students' entries" ON clinical_entries;
DROP POLICY IF EXISTS "Instructors can review entries" ON clinical_entries;

-- Now we can safely drop the columns
ALTER TABLE clinical_entries
DROP COLUMN IF EXISTS reviewed_by,
DROP COLUMN IF EXISTS reviewed_at;

-- Drop review-related indexes if they exist
DROP INDEX IF EXISTS idx_clinical_entries_reviewed;

-- Create simplified policies
CREATE POLICY "Students can create entries"
  ON clinical_entries
  FOR INSERT
  TO public
  WITH CHECK (
    -- Students can only create entries for themselves
    auth.uid() = student_id AND
    -- Verify the student has access to the form
    EXISTS (
      SELECT 1 FROM clinical_form_assignments cfa
      WHERE cfa.form_id = clinical_entries.form_id
      AND cfa.status = 'active'
      AND (
        -- Form is assigned directly to student
        cfa.student_id = auth.uid() OR
        -- Form is assigned to all students of instructor
        (cfa.student_id IS NULL AND cfa.instructor_id = (
          SELECT affiliated_instructor 
          FROM profiles 
          WHERE id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Students can view their own entries"
  ON clinical_entries
  FOR SELECT
  TO public
  USING (student_id = auth.uid());

CREATE POLICY "Instructors can view their students' entries"
  ON clinical_entries
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = clinical_entries.student_id
      AND affiliated_instructor = auth.uid()
    )
  );