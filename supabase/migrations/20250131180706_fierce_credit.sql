/*
  # Add responses column to skill_logs table

  1. Changes
    - Add JSONB responses column to skill_logs table to store form responses
    - Add index on responses column for better query performance
*/

-- Add responses column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_logs' 
    AND column_name = 'responses'
  ) THEN
    ALTER TABLE skill_logs ADD COLUMN responses JSONB;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_skill_logs_responses ON skill_logs USING gin(responses);