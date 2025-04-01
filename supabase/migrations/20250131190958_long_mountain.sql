/*
  # Fix skill status columns and types
  
  1. Changes
    - Add status column to skill_assignments table
    - Create and update status types for assignments and logs
    - Update trigger functions to handle status changes
*/

-- First add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_assignments' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE skill_assignments ADD COLUMN status TEXT;
  END IF;
END $$;

-- Drop and recreate the skill_assignment_status type
DROP TYPE IF EXISTS skill_assignment_status CASCADE;
CREATE TYPE skill_assignment_status AS ENUM ('pending', 'submitted', 'expired');

-- Drop and recreate the skill_log_status type
DROP TYPE IF EXISTS skill_log_status CASCADE;
CREATE TYPE skill_log_status AS ENUM ('pending', 'submitted', 'rejected');

-- Add completed_submissions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_assignments' 
    AND column_name = 'completed_submissions'
  ) THEN
    ALTER TABLE skill_assignments ADD COLUMN completed_submissions INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Set default status for existing rows
UPDATE skill_assignments 
SET status = 'pending' 
WHERE status IS NULL;

-- Now alter the column to use the enum type and make it not null
ALTER TABLE skill_assignments 
ALTER COLUMN status TYPE skill_assignment_status 
USING status::skill_assignment_status;

ALTER TABLE skill_assignments 
ALTER COLUMN status SET NOT NULL;

-- Update the skill assignment status trigger function
CREATE OR REPLACE FUNCTION update_skill_assignment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status to 'submitted' if required submissions are met
  IF NEW.completed_submissions >= NEW.required_submissions THEN
    NEW.status = 'submitted';
  -- Update status to 'expired' if due date has passed
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status = 'expired';
  -- Otherwise keep as pending
  ELSE
    NEW.status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS update_skill_assignment_status_trigger ON skill_assignments;
CREATE TRIGGER update_skill_assignment_status_trigger
  BEFORE INSERT OR UPDATE ON skill_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_assignment_status();

-- Update the completed submissions trigger
CREATE OR REPLACE FUNCTION update_completed_submissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed_submissions in skill_assignments when a skill log is submitted
  IF NEW.status = 'submitted' THEN
    UPDATE skill_assignments
    SET completed_submissions = (
      SELECT COUNT(*)
      FROM skill_logs
      WHERE skill_id = NEW.skill_id
      AND student_id = NEW.student_id
      AND status = 'submitted'
    )
    WHERE skill_id = NEW.skill_id
    AND student_id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS update_completed_submissions_trigger ON skill_logs;
CREATE TRIGGER update_completed_submissions_trigger
  AFTER INSERT OR UPDATE ON skill_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_submissions();