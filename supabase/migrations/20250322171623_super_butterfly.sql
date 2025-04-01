/*
  # Add Clinical Form Assignments

  1. New Tables
    - `clinical_form_assignments`: Links forms to instructors and students
      - `id` (uuid, primary key)
      - `form_id` (uuid, references clinical_forms)
      - `instructor_id` (uuid, references profiles)
      - `student_id` (uuid, references profiles, nullable)
      - `status` (enum: active, inactive)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for admin/instructor access
*/

-- Create form assignment status type
CREATE TYPE clinical_form_assignment_status AS ENUM ('active', 'inactive');

-- Create clinical form assignments table
CREATE TABLE clinical_form_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES clinical_forms(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID REFERENCES profiles(id),
  status clinical_form_assignment_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, instructor_id, student_id)
);

-- Enable RLS
ALTER TABLE clinical_form_assignments ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_clinical_form_assignments_form ON clinical_form_assignments(form_id);
CREATE INDEX idx_clinical_form_assignments_instructor ON clinical_form_assignments(instructor_id);
CREATE INDEX idx_clinical_form_assignments_student ON clinical_form_assignments(student_id);
CREATE INDEX idx_clinical_form_assignments_status ON clinical_form_assignments(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_clinical_form_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clinical_form_assignments_updated_at
  BEFORE UPDATE ON clinical_form_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_clinical_form_assignments_updated_at();

-- Create policies
CREATE POLICY "Admins can manage all assignments"
  ON clinical_form_assignments
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Instructors can view their assignments"
  ON clinical_form_assignments
  FOR SELECT
  TO public
  USING (instructor_id = auth.uid());

CREATE POLICY "Instructors can manage student assignments"
  ON clinical_form_assignments
  FOR INSERT
  TO public
  WITH CHECK (
    instructor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = student_id
      AND affiliated_instructor = auth.uid()
    )
  );

CREATE POLICY "Students can view their assignments"
  ON clinical_form_assignments
  FOR SELECT
  TO public
  USING (student_id = auth.uid());