-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS update_completed_submissions_trigger ON skill_logs;
DROP FUNCTION IF EXISTS update_completed_submissions();

-- Drop existing type if it exists
DROP TYPE IF EXISTS skill_log_status CASCADE;

-- Create new status type
CREATE TYPE skill_log_status AS ENUM ('submitted', 'rejected');

-- Create a new status column with the enum type
ALTER TABLE skill_logs 
ADD COLUMN new_status skill_log_status;

-- Set default values for new status column
UPDATE skill_logs 
SET new_status = 'submitted'::skill_log_status;

-- Make the new status column required
ALTER TABLE skill_logs 
ALTER COLUMN new_status SET NOT NULL;

-- Drop the old status column if it exists
ALTER TABLE skill_logs 
DROP COLUMN IF EXISTS status;

-- Rename the new column to status
ALTER TABLE skill_logs 
RENAME COLUMN new_status TO status;

-- Recreate the completed submissions trigger function
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

-- Recreate the trigger
CREATE TRIGGER update_completed_submissions_trigger
  AFTER INSERT OR UPDATE ON skill_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_submissions();