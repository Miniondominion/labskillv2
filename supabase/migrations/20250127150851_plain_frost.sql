-- Add required_submissions column to skill_assignments table
ALTER TABLE skill_assignments 
ADD COLUMN required_submissions INTEGER NOT NULL DEFAULT 1;

-- Add check constraint to ensure required_submissions is positive
ALTER TABLE skill_assignments 
ADD CONSTRAINT skill_assignments_required_submissions_check 
CHECK (required_submissions > 0);

-- Create index for better performance
CREATE INDEX idx_skill_assignments_required_submissions 
ON skill_assignments(required_submissions);