/*
  # Add Reporting Tables and Functions

  1. New Tables
    - `form_submissions`: Stores flattened form submission data
    - `skill_submissions`: Stores flattened skill submission data
    
  2. New Functions
    - `flatten_form_submission`: Converts JSONB form data to columns
    - `flatten_skill_submission`: Converts JSONB skill data to columns
    
  3. Triggers
    - Auto-flatten submissions on insert/update
    
  4. Security
    - RLS policies match parent tables
*/

-- Create form submissions table
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES clinical_entries(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES clinical_forms(id),
  submitted_at TIMESTAMPTZ NOT NULL,
  -- Metadata columns
  location TEXT,
  department TEXT,
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  preceptor_name TEXT,
  preceptor_credentials TEXT,
  preceptor_email TEXT,
  -- Dynamic columns will be added by trigger
  form_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create skill submissions table
CREATE TABLE skill_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES skill_logs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id),
  submitted_at TIMESTAMPTZ NOT NULL,
  -- Metadata columns
  evaluator_name TEXT NOT NULL,
  evaluator_type TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status skill_log_status NOT NULL,
  -- Dynamic columns will be added by trigger
  responses JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_submissions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_form_submissions_entry ON form_submissions(entry_id);
CREATE INDEX idx_form_submissions_student ON form_submissions(student_id);
CREATE INDEX idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_submitted ON form_submissions(submitted_at);

CREATE INDEX idx_skill_submissions_log ON skill_submissions(log_id);
CREATE INDEX idx_skill_submissions_student ON skill_submissions(student_id);
CREATE INDEX idx_skill_submissions_skill ON skill_submissions(skill_id);
CREATE INDEX idx_skill_submissions_submitted ON skill_submissions(submitted_at);
CREATE INDEX idx_skill_submissions_status ON skill_submissions(status);

-- Function to dynamically create columns for form fields
CREATE OR REPLACE FUNCTION create_form_submission_columns(p_form_id UUID)
RETURNS void AS $$
DECLARE
  field RECORD;
  column_name TEXT;
  column_type TEXT;
BEGIN
  FOR field IN 
    SELECT 
      field_name,
      field_type,
      field_label
    FROM clinical_form_fields
    WHERE form_id = p_form_id
    ORDER BY order_index
  LOOP
    -- Generate safe column name
    column_name := lower(regexp_replace(field.field_name, '[^a-zA-Z0-9_]', '_', 'g'));
    
    -- Map field type to column type
    CASE field.field_type
      WHEN 'number' THEN column_type := 'NUMERIC';
      WHEN 'date' THEN column_type := 'DATE';
      WHEN 'time' THEN column_type := 'TIME';
      WHEN 'checkbox' THEN column_type := 'BOOLEAN';
      ELSE column_type := 'TEXT';
    END CASE;

    -- Add column if it doesn't exist
    EXECUTE format(
      'ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS %I %s',
      column_name,
      column_type
    );

    -- Add comment with original field label
    EXECUTE format(
      'COMMENT ON COLUMN form_submissions.%I IS %L',
      column_name,
      field.field_label
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to dynamically create columns for skill questions
CREATE OR REPLACE FUNCTION create_skill_submission_columns(p_skill_id UUID)
RETURNS void AS $$
DECLARE
  question RECORD;
  column_name TEXT;
  column_type TEXT;
BEGIN
  FOR question IN 
    SELECT 
      id,
      question_text,
      response_type
    FROM skill_questions
    WHERE skill_id = p_skill_id
    ORDER BY order_index
  LOOP
    -- Generate safe column name
    column_name := 'q_' || question.id;
    
    -- Map response type to column type
    CASE question.response_type
      WHEN 'number' THEN column_type := 'NUMERIC';
      WHEN 'checkbox' THEN column_type := 'BOOLEAN';
      ELSE column_type := 'TEXT';
    END CASE;

    -- Add column if it doesn't exist
    EXECUTE format(
      'ALTER TABLE skill_submissions ADD COLUMN IF NOT EXISTS %I %s',
      column_name,
      column_type
    );

    -- Add comment with original question text
    EXECUTE format(
      'COMMENT ON COLUMN skill_submissions.%I IS %L',
      column_name,
      question.question_text
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to flatten and insert form submission
CREATE OR REPLACE FUNCTION flatten_form_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure columns exist for this form
  PERFORM create_form_submission_columns(NEW.form_id);

  -- Insert flattened data
  INSERT INTO form_submissions (
    entry_id,
    student_id,
    form_id,
    submitted_at,
    location,
    department,
    shift_start,
    shift_end,
    preceptor_name,
    preceptor_credentials,
    preceptor_email,
    form_data
  ) VALUES (
    NEW.id,
    NEW.student_id,
    NEW.form_id,
    NEW.submitted_at,
    NEW.location,
    NEW.department,
    NEW.shift_start,
    NEW.shift_end,
    NEW.preceptor_name,
    NEW.preceptor_credentials,
    NEW.preceptor_email,
    NEW.form_data
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to flatten and insert skill submission
CREATE OR REPLACE FUNCTION flatten_skill_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure columns exist for this skill
  PERFORM create_skill_submission_columns(NEW.skill_id);

  -- Insert flattened data
  INSERT INTO skill_submissions (
    log_id,
    student_id,
    skill_id,
    submitted_at,
    evaluator_name,
    evaluator_type,
    attempt_number,
    status,
    responses
  ) VALUES (
    NEW.id,
    NEW.student_id,
    NEW.skill_id,
    NEW.created_at,
    NEW.evaluator_name,
    NEW.evaluator_type,
    NEW.attempt_number,
    NEW.status,
    NEW.responses
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER flatten_form_submission_trigger
  AFTER INSERT OR UPDATE ON clinical_entries
  FOR EACH ROW
  EXECUTE FUNCTION flatten_form_submission();

CREATE TRIGGER flatten_skill_submission_trigger
  AFTER INSERT OR UPDATE ON skill_logs
  FOR EACH ROW
  EXECUTE FUNCTION flatten_skill_submission();

-- Create policies that mirror parent table permissions
CREATE POLICY "Students can view their own form submissions"
  ON form_submissions
  FOR SELECT
  TO public
  USING (student_id = auth.uid());

CREATE POLICY "Instructors can view their students' form submissions"
  ON form_submissions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = form_submissions.student_id
      AND affiliated_instructor = auth.uid()
    )
  );

CREATE POLICY "Students can view their own skill submissions"
  ON skill_submissions
  FOR SELECT
  TO public
  USING (student_id = auth.uid());

CREATE POLICY "Instructors can view their students' skill submissions"
  ON skill_submissions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = skill_submissions.student_id
      AND affiliated_instructor = auth.uid()
    )
  );