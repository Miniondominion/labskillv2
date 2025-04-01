-- Add new columns to clinical_form_fields if they don't exist
DO $$ 
BEGIN
  -- Add is_repeatable column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinical_form_fields' 
    AND column_name = 'is_repeatable'
  ) THEN
    ALTER TABLE clinical_form_fields
    ADD COLUMN is_repeatable BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add group_key column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinical_form_fields' 
    AND column_name = 'group_key'
  ) THEN
    ALTER TABLE clinical_form_fields
    ADD COLUMN group_key TEXT;
  END IF;

  -- Add max_repetitions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinical_form_fields' 
    AND column_name = 'max_repetitions'
  ) THEN
    ALTER TABLE clinical_form_fields
    ADD COLUMN max_repetitions INTEGER;
  END IF;
END $$;

-- Add check constraint for max_repetitions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clinical_form_fields_max_repetitions_check'
  ) THEN
    ALTER TABLE clinical_form_fields
    ADD CONSTRAINT clinical_form_fields_max_repetitions_check
    CHECK (max_repetitions IS NULL OR max_repetitions > 0);
  END IF;
END $$;

-- Create index for group lookups if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'clinical_form_fields' 
    AND indexname = 'idx_clinical_form_fields_group'
  ) THEN
    CREATE INDEX idx_clinical_form_fields_group 
    ON clinical_form_fields(group_key) 
    WHERE group_key IS NOT NULL;
  END IF;
END $$;

-- Modify form_data column in clinical_entries to handle arrays
COMMENT ON COLUMN clinical_entries.form_data IS 'Stores form responses including repeatable field groups as arrays';