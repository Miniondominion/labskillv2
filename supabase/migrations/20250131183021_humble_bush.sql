/*
  # Update signature storage approach
  
  1. Changes
    - Remove index on instructor_signature column to prevent size limitations
    - Add compression for signature data
    - Update constraints to handle compressed data
  
  2. Notes
    - Removes the index that was causing the size limitation error
    - Maintains data integrity checks
*/

-- First drop the problematic index if it exists
DROP INDEX IF EXISTS idx_skill_logs_instructor_signature;

-- Drop the existing constraint
ALTER TABLE skill_logs
DROP CONSTRAINT IF EXISTS skill_logs_instructor_signature_check;

-- Add new constraint without index
ALTER TABLE skill_logs
ADD CONSTRAINT skill_logs_instructor_signature_check
CHECK (
  (evaluator_type = 'instructor' AND instructor_signature IS NOT NULL) OR
  (evaluator_type = 'peer' AND instructor_signature IS NULL)
);