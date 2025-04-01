/*
  # Clinical Documentation Schema

  1. New Tables
    - `clinical_types`: Defines different clinical settings (EMS Field, Facility)
    - `clinical_forms`: Stores form templates for each clinical type
    - `clinical_form_fields`: Defines fields for each form
    - `clinical_entries`: Stores student documentation entries
    - `clinical_entry_drafts`: Stores temporary drafts
    
  2. Security
    - Enable RLS on all tables
    - Add policies for admin/instructor/student access
*/

-- Create clinical types table
CREATE TABLE clinical_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clinical forms table
CREATE TABLE clinical_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_type_id UUID NOT NULL REFERENCES clinical_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clinical form fields table
CREATE TABLE clinical_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES clinical_forms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'time', 'select', 'multiselect', 'checkbox')),
  field_label TEXT NOT NULL,
  field_options JSONB,
  required BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clinical entries table
CREATE TABLE clinical_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinical_type_id UUID NOT NULL REFERENCES clinical_types(id),
  form_id UUID NOT NULL REFERENCES clinical_forms(id),
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  preceptor_name TEXT NOT NULL,
  preceptor_credentials TEXT,
  preceptor_email TEXT,
  form_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clinical entry drafts table
CREATE TABLE clinical_entry_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinical_type_id UUID NOT NULL REFERENCES clinical_types(id),
  form_id UUID NOT NULL REFERENCES clinical_forms(id),
  form_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create function to enforce max drafts per student
CREATE OR REPLACE FUNCTION enforce_max_drafts()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM clinical_entry_drafts
    WHERE student_id = NEW.student_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Maximum number of drafts (5) exceeded for student';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for max drafts enforcement
CREATE TRIGGER enforce_max_drafts_trigger
  BEFORE INSERT ON clinical_entry_drafts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_drafts();

-- Enable RLS
ALTER TABLE clinical_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_entry_drafts ENABLE ROW LEVEL SECURITY;

-- Policies for clinical_types
CREATE POLICY "Clinical types are viewable by everyone"
  ON clinical_types FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage clinical types"
  ON clinical_types FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policies for clinical_forms
CREATE POLICY "Clinical forms are viewable by everyone"
  ON clinical_forms FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage clinical forms"
  ON clinical_forms FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policies for clinical_form_fields
CREATE POLICY "Clinical form fields are viewable by everyone"
  ON clinical_form_fields FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage clinical form fields"
  ON clinical_form_fields FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policies for clinical_entries
CREATE POLICY "Students can view their own entries"
  ON clinical_entries FOR SELECT
  TO public
  USING (student_id = auth.uid());

CREATE POLICY "Instructors can view their students' entries"
  ON clinical_entries FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = clinical_entries.student_id
      AND affiliated_instructor = auth.uid()
    )
  );

CREATE POLICY "Students can create entries"
  ON clinical_entries FOR INSERT
  TO public
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Instructors can review entries"
  ON clinical_entries FOR UPDATE
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

-- Policies for clinical_entry_drafts
CREATE POLICY "Students can manage their own drafts"
  ON clinical_entry_drafts FOR ALL
  TO public
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_clinical_forms_type ON clinical_forms(clinical_type_id);
CREATE INDEX idx_clinical_form_fields_form ON clinical_form_fields(form_id);
CREATE INDEX idx_clinical_entries_student ON clinical_entries(student_id);
CREATE INDEX idx_clinical_entries_type ON clinical_entries(clinical_type_id);
CREATE INDEX idx_clinical_entries_form ON clinical_entries(form_id);
CREATE INDEX idx_clinical_entry_drafts_student ON clinical_entry_drafts(student_id);
CREATE INDEX idx_clinical_entry_drafts_expires ON clinical_entry_drafts(expires_at);

-- Insert initial clinical types
INSERT INTO clinical_types (name, description) VALUES
('EMS Field', 'Emergency Medical Services field operations and patient care'),
('Facility', 'Clinical care provided in healthcare facilities');

-- Create function to clean up expired drafts
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM clinical_entry_drafts
  WHERE expires_at < now();
END;
$$;

-- Create a scheduled job to clean up expired drafts
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('cleanup-expired-drafts', '0 * * * *', 'SELECT cleanup_expired_drafts()');