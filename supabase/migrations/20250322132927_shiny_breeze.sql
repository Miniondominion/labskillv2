-- Remove group-related columns from clinical_form_fields
DO $$ 
BEGIN
  -- Drop columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinical_form_fields' 
    AND column_name = 'is_repeatable'
  ) THEN
    ALTER TABLE clinical_form_fields DROP COLUMN is_repeatable;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinical_form_fields' 
    AND column_name = 'group_key'
  ) THEN
    ALTER TABLE clinical_form_fields DROP COLUMN group_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinical_form_fields' 
    AND column_name = 'max_repetitions'
  ) THEN
    ALTER TABLE clinical_form_fields DROP COLUMN max_repetitions;
  END IF;

  -- Drop constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clinical_form_fields_max_repetitions_check'
  ) THEN
    ALTER TABLE clinical_form_fields 
    DROP CONSTRAINT clinical_form_fields_max_repetitions_check;
  END IF;

  -- Drop index if it exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'clinical_form_fields' 
    AND indexname = 'idx_clinical_form_fields_group'
  ) THEN
    DROP INDEX idx_clinical_form_fields_group;
  END IF;
END $$;