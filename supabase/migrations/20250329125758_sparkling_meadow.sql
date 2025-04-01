/*
  # Add Active Clinical Shifts

  1. New Tables
    - `clinical_shifts`: Stores active clinical shifts
      - `id` (uuid, primary key)
      - `student_id` (uuid, references profiles)
      - `location` (text)
      - `department` (text)
      - `shift_start` (timestamptz)
      - `shift_end` (timestamptz)
      - `preceptor_name` (text)
      - `preceptor_credentials` (text)
      - `preceptor_email` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for student access
*/

-- Create clinical shifts table
CREATE TABLE clinical_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  department TEXT NOT NULL,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  preceptor_name TEXT NOT NULL,
  preceptor_credentials TEXT,
  preceptor_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE clinical_shifts ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_clinical_shifts_student ON clinical_shifts(student_id);
CREATE INDEX idx_clinical_shifts_active ON clinical_shifts(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_clinical_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clinical_shifts_updated_at
  BEFORE UPDATE ON clinical_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_clinical_shifts_updated_at();

-- Create policies
CREATE POLICY "Students can manage their own shifts"
  ON clinical_shifts
  FOR ALL
  TO public
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Create function to ensure only one active shift per student
CREATE OR REPLACE FUNCTION check_active_shift()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active AND EXISTS (
    SELECT 1 FROM clinical_shifts
    WHERE student_id = NEW.student_id
    AND is_active = true
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Student already has an active shift';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_active_shift_trigger
  BEFORE INSERT OR UPDATE ON clinical_shifts
  FOR EACH ROW
  EXECUTE FUNCTION check_active_shift();