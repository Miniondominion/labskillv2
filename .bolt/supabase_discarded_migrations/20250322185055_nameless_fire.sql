/*
  # Fix Clinical Entries Policies

  1. Changes
    - Drop existing policies
    - Create new policies that properly handle form submissions
    - Add proper RLS checks for student and instructor access
    
  2. Security
    - Maintain proper access control
    - Ensure students can only submit forms they have access to
    - Allow instructors to review their students' submissions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Students can create entries" ON clinical_entries;
DROP POLICY IF EXISTS "Students can view their own entries" ON clinical_entries;
DROP POLICY IF EXISTS "Instructors can view their students' entries" ON clinical_entries;
DROP POLICY IF EXISTS "Instructors can review entries" ON clinical_entries;

-- Create new policies
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

CREATE POLICY "Instructors can review entries"
  ON clinical_entries
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = clinical_entries.student_id
      AND affiliated_instructor = auth.uid()
    )
  )
  WITH CHECK (
    reviewed_by = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clinical_entries_reviewed ON clinical_entries(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_clinical_entries_submitted ON clinical_entries(submitted_at);