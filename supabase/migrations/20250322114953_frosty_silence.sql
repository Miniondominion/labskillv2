/*
  # Add Support for Repeatable Form Fields

  1. Changes
    - Add repeatable flag to clinical_form_fields
    - Add group_key to support related repeatable fields
    - Add max_repetitions to limit number of repetitions
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to clinical_form_fields
ALTER TABLE clinical_form_fields
ADD COLUMN is_repeatable BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN group_key TEXT,
ADD COLUMN max_repetitions INTEGER;

-- Add check constraint for max_repetitions
ALTER TABLE clinical_form_fields
ADD CONSTRAINT clinical_form_fields_max_repetitions_check
CHECK (max_repetitions IS NULL OR max_repetitions > 0);

-- Create index for group lookups
CREATE INDEX idx_clinical_form_fields_group 
ON clinical_form_fields(group_key) 
WHERE group_key IS NOT NULL;

-- Modify form_data column in clinical_entries to handle arrays
COMMENT ON COLUMN clinical_entries.form_data IS 'Stores form responses including repeatable field groups as arrays';