-- Drop existing types if they exist
DROP TYPE IF EXISTS skill_assignment_status CASCADE;
DROP TYPE IF EXISTS skill_log_status CASCADE;

-- Create new status types
CREATE TYPE skill_assignment_status AS ENUM ('pending', 'submitted', 'expired');
CREATE TYPE skill_log_status AS ENUM ('pending', 'submitted', 'rejected');

-- First ensure the status columns exist as text
DO $$ 
BEGIN
  -- Add status column to skill_assignments if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_assignments' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE skill_assignments ADD COLUMN status skill_assignment_status NOT NULL DEFAULT 'pending';
  END IF;

  -- Add status column to skill_logs if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_logs' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE skill_logs ADD COLUMN status skill_log_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

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

-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS update_skill_assignment_status_trigger ON skill_assignments;
DROP FUNCTION IF EXISTS update_skill_assignment_status();
DROP TRIGGER IF EXISTS update_completed_submissions_trigger ON skill_logs;
DROP FUNCTION IF EXISTS update_completed_submissions();

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

-- Create trigger for status updates
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

-- Create trigger for completed submissions updates
CREATE TRIGGER update_completed_submissions_trigger
  AFTER INSERT OR UPDATE ON skill_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_submissions();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skill_assignments_status ON skill_assignments(status);
CREATE INDEX IF NOT EXISTS idx_skill_logs_status ON skill_logs(status);
CREATE INDEX IF NOT EXISTS idx_skill_assignments_completed_submissions ON skill_assignments(completed_submissions);