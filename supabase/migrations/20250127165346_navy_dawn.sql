-- Add due_date column to skill_assignments table
ALTER TABLE skill_assignments 
ADD COLUMN due_date DATE;

-- Create index for better performance
CREATE INDEX idx_skill_assignments_due_date 
ON skill_assignments(due_date);

-- Add check constraint to ensure due_date is not in the past when set
ALTER TABLE skill_assignments 
ADD CONSTRAINT skill_assignments_due_date_check 
CHECK (due_date IS NULL OR due_date >= CURRENT_DATE);

-- Update trigger to handle due_date expiration
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

CREATE TRIGGER check_skill_assignment_status_trigger
  BEFORE INSERT OR UPDATE ON skill_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_skill_assignment_status();