/*
  # Add date constraints to classes

  1. Changes
    - Add check constraint to ensure end_date is after start_date
  
  2. Notes
    - Only adds the constraint since the columns already exist
*/

-- Add check constraint to ensure end_date is after start_date
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'classes_dates_check'
  ) THEN
    ALTER TABLE classes 
    ADD CONSTRAINT classes_dates_check 
    CHECK (end_date >= start_date);
  END IF;
END $$;