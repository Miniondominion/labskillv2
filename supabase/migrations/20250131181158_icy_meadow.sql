/*
  # Update skill_logs table structure
  
  1. Changes
    - Make class_id column optional in skill_logs table
    - Add attempt_number column with default value of 1
*/

-- Make class_id optional
ALTER TABLE skill_logs 
ALTER COLUMN class_id DROP NOT NULL;

-- Add attempt_number if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_logs' 
    AND column_name = 'attempt_number'
  ) THEN
    ALTER TABLE skill_logs 
    ADD COLUMN attempt_number INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_skill_logs_attempt ON skill_logs(attempt_number);