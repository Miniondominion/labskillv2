/*
  # Add Type Name Columns for Optimized Querying

  1. New Columns
    - Add clinical_type_name to form_submissions
    - Add skill_category_name to skill_submissions
    - Add skill_name to skill_submissions
    
  2. Changes
    - Update flatten functions to populate new columns
    - Add indexes for better query performance
*/

-- Add new columns to form_submissions
ALTER TABLE form_submissions
ADD COLUMN clinical_type_name TEXT,
ADD COLUMN form_name TEXT;

-- Add new columns to skill_submissions
ALTER TABLE skill_submissions
ADD COLUMN skill_name TEXT,
ADD COLUMN skill_category_name TEXT;

-- Create indexes for better performance
CREATE INDEX idx_form_submissions_type_name ON form_submissions(clinical_type_name);
CREATE INDEX idx_form_submissions_form_name ON form_submissions(form_name);
CREATE INDEX idx_skill_submissions_skill_name ON skill_submissions(skill_name);
CREATE INDEX idx_skill_submissions_category ON skill_submissions(skill_category_name);

-- Update flatten_form_submission function to populate new columns
CREATE OR REPLACE FUNCTION flatten_form_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_type_name TEXT;
  v_form_name TEXT;
BEGIN
  -- Get type name and form name
  SELECT 
    ct.name,
    cf.name
  INTO 
    v_type_name,
    v_form_name
  FROM clinical_forms cf
  JOIN clinical_types ct ON ct.id = cf.clinical_type_id
  WHERE cf.id = NEW.form_id;

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
    form_data,
    clinical_type_name,
    form_name
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
    NEW.form_data,
    v_type_name,
    v_form_name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update flatten_skill_submission function to populate new columns
CREATE OR REPLACE FUNCTION flatten_skill_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_name TEXT;
  v_category_name TEXT;
BEGIN
  -- Get skill name and category name
  SELECT 
    s.name,
    sc.name
  INTO 
    v_skill_name,
    v_category_name
  FROM skills s
  JOIN skill_categories sc ON sc.id = s.category_id
  WHERE s.id = NEW.skill_id;

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
    responses,
    skill_name,
    skill_category_name
  ) VALUES (
    NEW.id,
    NEW.student_id,
    NEW.skill_id,
    NEW.created_at,
    NEW.evaluator_name,
    NEW.evaluator_type,
    NEW.attempt_number,
    NEW.status,
    NEW.responses,
    v_skill_name,
    v_category_name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing data
DO $$
DECLARE
  v_entry RECORD;
  v_log RECORD;
BEGIN
  -- Backfill form submissions
  FOR v_entry IN 
    SELECT 
      fs.id AS submission_id,
      ct.name AS type_name,
      cf.name AS form_name
    FROM form_submissions fs
    JOIN clinical_forms cf ON cf.id = fs.form_id
    JOIN clinical_types ct ON ct.id = cf.clinical_type_id
    WHERE fs.clinical_type_name IS NULL
  LOOP
    UPDATE form_submissions
    SET 
      clinical_type_name = v_entry.type_name,
      form_name = v_entry.form_name
    WHERE id = v_entry.submission_id;
  END LOOP;

  -- Backfill skill submissions
  FOR v_log IN 
    SELECT 
      ss.id AS submission_id,
      s.name AS skill_name,
      sc.name AS category_name
    FROM skill_submissions ss
    JOIN skills s ON s.id = ss.skill_id
    JOIN skill_categories sc ON sc.id = s.category_id
    WHERE ss.skill_name IS NULL
  LOOP
    UPDATE skill_submissions
    SET 
      skill_name = v_log.skill_name,
      skill_category_name = v_log.category_name
    WHERE id = v_log.submission_id;
  END LOOP;
END $$;