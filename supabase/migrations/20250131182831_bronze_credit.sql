-- Add verification_type column with a default value first
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS verification_type TEXT DEFAULT 'peer';

-- Now make it NOT NULL after it has a default
ALTER TABLE skills 
ALTER COLUMN verification_type SET NOT NULL;

-- Add check constraint for verification_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'skills_verification_type_check'
  ) THEN
    ALTER TABLE skills 
    ADD CONSTRAINT skills_verification_type_check 
    CHECK (verification_type IN ('peer', 'instructor'));
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_skills_verification_type 
ON skills(verification_type);