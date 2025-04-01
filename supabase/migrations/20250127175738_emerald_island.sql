/*
  # Update skill assignments table

  1. Changes
    - Ensures due_date column exists with proper constraints
    - Adds expiration handling trigger
    - Updates indexes for performance

  2. Safety
    - Uses IF NOT EXISTS checks
    - Preserves existing data
    - Handles column/constraint existence
*/

-- Safely handle due_date column and constraints
DO $$ 
BEGIN
  -- Add due_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_assignments' 
    AND column_name = 'due_date'
  ) THEN
    ALTER TABLE skill_assignments ADD COLUMN due_date DATE;
  END IF;

  -- Add due_date index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'skill_assignments' 
    AND indexname = 'idx_skill_assignments_due_date'
  ) THEN
    CREATE INDEX idx_skill_assignments_due_date ON skill_assignments(due_date);
  END IF;

  -- Add due_date check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'skill_assignments_due_date_check'
  ) THEN
    ALTER TABLE skill_assignments 
    ADD CONSTRAINT skill_assignments_due_date_check 
    CHECK (due_date IS NULL OR due_date >= CURRENT_DATE);
  END IF;
END $$;

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS check_skill_assignment_status_trigger ON skill_assignments;
DROP FUNCTION IF EXISTS check_skill_assignment_status();

-- Create or replace the status check function
CREATE OR REPLACE FUNCTION check_skill_assignment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status to 'expired' if due_date has passed
  IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER check_skill_assignment_status_trigger
  BEFORE INSERT OR UPDATE ON skill_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_skill_assignment_status();