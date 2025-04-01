-- Add completed_submissions column with default value
ALTER TABLE skill_assignments 
ADD COLUMN completed_submissions INTEGER NOT NULL DEFAULT 0;

-- Add check constraint to ensure completed_submissions is not negative
ALTER TABLE skill_assignments 
ADD CONSTRAINT skill_assignments_completed_submissions_check 
CHECK (completed_submissions >= 0);

-- Add check constraint to ensure completed_submissions doesn't exceed required_submissions
ALTER TABLE skill_assignments 
ADD CONSTRAINT skill_assignments_submissions_check 
CHECK (completed_submissions <= required_submissions);

-- Create index for better performance
CREATE INDEX idx_skill_assignments_completed_submissions 
ON skill_assignments(completed_submissions);

-- Create function to update skill assignment status based on submissions
CREATE OR REPLACE FUNCTION update_skill_assignment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status to 'completed' if required submissions are met
  IF NEW.completed_submissions >= NEW.required_submissions THEN
    NEW.status = 'completed';
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

-- Create trigger to automatically update status
CREATE TRIGGER update_skill_assignment_status_trigger
  BEFORE INSERT OR UPDATE ON skill_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_assignment_status();