/*
  # Portfolio Templates Schema

  1. New Tables
    - `portfolio_templates`: Master templates for student portfolios
    - `portfolio_sections`: Sections within templates (e.g., Personal Info, Education)
    - `portfolio_fields`: Individual fields within sections
    - `portfolio_instances`: Student portfolio instances
    - `portfolio_data`: Actual portfolio data/values

  2. Security
    - Enable RLS
    - Add policies for admin/student access
*/

-- Create portfolio templates table
CREATE TABLE portfolio_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create portfolio sections table
CREATE TABLE portfolio_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES portfolio_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create portfolio fields table
CREATE TABLE portfolio_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES portfolio_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text',
    'longtext',
    'number',
    'date',
    'select',
    'multiselect',
    'file',
    'image',
    'link',
    'skill_list',
    'clinical_list'
  )),
  is_required BOOLEAN NOT NULL DEFAULT true,
  options JSONB, -- For select/multiselect fields
  validation_rules JSONB, -- For custom validation
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create portfolio instances table
CREATE TABLE portfolio_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES portfolio_templates(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE(template_id, student_id)
);

-- Create portfolio data table
CREATE TABLE portfolio_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES portfolio_instances(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES portfolio_fields(id),
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, field_id)
);

-- Enable RLS
ALTER TABLE portfolio_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_data ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_portfolio_sections_template ON portfolio_sections(template_id);
CREATE INDEX idx_portfolio_fields_section ON portfolio_fields(section_id);
CREATE INDEX idx_portfolio_instances_template ON portfolio_instances(template_id);
CREATE INDEX idx_portfolio_instances_student ON portfolio_instances(student_id);
CREATE INDEX idx_portfolio_data_instance ON portfolio_data(instance_id);
CREATE INDEX idx_portfolio_data_field ON portfolio_data(field_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_templates_updated_at
  BEFORE UPDATE ON portfolio_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_sections_updated_at
  BEFORE UPDATE ON portfolio_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_fields_updated_at
  BEFORE UPDATE ON portfolio_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_instances_updated_at
  BEFORE UPDATE ON portfolio_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_data_updated_at
  BEFORE UPDATE ON portfolio_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
CREATE POLICY "Admins can manage portfolio templates"
  ON portfolio_templates
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view active templates"
  ON portfolio_templates
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage portfolio sections"
  ON portfolio_sections
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view portfolio sections"
  ON portfolio_sections
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage portfolio fields"
  ON portfolio_fields
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view portfolio fields"
  ON portfolio_fields
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Students can manage their own portfolio instances"
  ON portfolio_instances
  FOR ALL
  TO public
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Instructors can view their students' portfolios"
  ON portfolio_instances
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = portfolio_instances.student_id
      AND affiliated_instructor = auth.uid()
    )
  );

CREATE POLICY "Students can manage their own portfolio data"
  ON portfolio_data
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_instances
      WHERE id = portfolio_data.instance_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can view their students' portfolio data"
  ON portfolio_data
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_instances pi
      JOIN profiles p ON p.id = pi.student_id
      WHERE pi.id = portfolio_data.instance_id
      AND p.affiliated_instructor = auth.uid()
    )
  );

-- Insert default template sections
INSERT INTO portfolio_templates (name, description, created_by)
SELECT 
  'Student Portfolio',
  'Standard student portfolio template',
  id
FROM profiles 
WHERE role = 'admin'
LIMIT 1;

DO $$ 
DECLARE
  v_template_id UUID;
  v_section_id UUID;
BEGIN
  -- Get the template ID
  SELECT id INTO v_template_id
  FROM portfolio_templates
  LIMIT 1;

  -- Create Personal Information section
  INSERT INTO portfolio_sections (template_id, name, description, order_index)
  VALUES (
    v_template_id,
    'Personal Information',
    'Basic student information',
    0
  ) RETURNING id INTO v_section_id;

  -- Add fields to Personal Information section
  INSERT INTO portfolio_fields (section_id, name, label, field_type, is_required, order_index)
  VALUES
    (v_section_id, 'full_name', 'Full Name', 'text', true, 0),
    (v_section_id, 'email', 'Email Address', 'text', true, 1),
    (v_section_id, 'phone', 'Phone Number', 'text', false, 2),
    (v_section_id, 'bio', 'Biography', 'longtext', false, 3),
    (v_section_id, 'profile_image', 'Profile Image', 'image', false, 4);

  -- Create Education section
  INSERT INTO portfolio_sections (template_id, name, description, order_index)
  VALUES (
    v_template_id,
    'Education',
    'Educational background and certifications',
    1
  ) RETURNING id INTO v_section_id;

  -- Add fields to Education section
  INSERT INTO portfolio_fields (section_id, name, label, field_type, is_required, order_index)
  VALUES
    (v_section_id, 'program', 'Current Program', 'text', true, 0),
    (v_section_id, 'certifications', 'Certifications', 'multiselect', false, 1);

  -- Create Skills section
  INSERT INTO portfolio_sections (template_id, name, description, order_index)
  VALUES (
    v_template_id,
    'Clinical Skills',
    'Completed clinical skills and competencies',
    2
  ) RETURNING id INTO v_section_id;

  -- Add fields to Skills section
  INSERT INTO portfolio_fields (section_id, name, label, field_type, is_required, order_index)
  VALUES
    (v_section_id, 'completed_skills', 'Completed Skills', 'skill_list', true, 0),
    (v_section_id, 'clinical_hours', 'Clinical Hours', 'clinical_list', true, 1);
END $$;