-- Add instructor_signature column to skill_logs table
ALTER TABLE skill_logs 
ADD COLUMN IF NOT EXISTS instructor_signature TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_skill_logs_instructor_signature 
ON skill_logs(instructor_signature);

-- Add check constraint to ensure instructor_signature is present for instructor verification
ALTER TABLE skill_logs
ADD CONSTRAINT skill_logs_instructor_signature_check
CHECK (
  (evaluator_type = 'instructor' AND instructor_signature IS NOT NULL) OR
  (evaluator_type = 'peer' AND instructor_signature IS NULL)
);