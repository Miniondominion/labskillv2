/*
  # Add archived column to classes

  1. Changes
    - Add archived column to classes table if it doesn't exist
    - Set default value to false
    - Add index for better query performance
*/

DO $$ 
BEGIN
  -- Add archived column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'archived'
  ) THEN
    ALTER TABLE classes ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add index for archived column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'classes' AND indexname = 'idx_classes_archived'
  ) THEN
    CREATE INDEX idx_classes_archived ON classes(archived);
  END IF;
END $$;