/*
  # Add evaluator columns to skill_logs table

  1. Changes
    - Add evaluator_name and evaluator_type columns with default values
    - Add check constraint for evaluator_type
    - Create indexes for better query performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add evaluator columns with defaults first
ALTER TABLE skill_logs 
ADD COLUMN IF NOT EXISTS evaluator_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS evaluator_type TEXT DEFAULT 'peer';

-- Now make them NOT NULL after they have defaults
ALTER TABLE skill_logs 
ALTER COLUMN evaluator_name SET NOT NULL,
ALTER COLUMN evaluator_type SET NOT NULL;

-- Add check constraint for evaluator_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'skill_logs_evaluator_type_check'
  ) THEN
    ALTER TABLE skill_logs 
    ADD CONSTRAINT skill_logs_evaluator_type_check 
    CHECK (evaluator_type IN ('peer', 'instructor'));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skill_logs_evaluator_name 
ON skill_logs(evaluator_name);

CREATE INDEX IF NOT EXISTS idx_skill_logs_evaluator_type 
ON skill_logs(evaluator_type);