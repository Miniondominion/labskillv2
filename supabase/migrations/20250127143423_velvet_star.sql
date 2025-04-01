-- Add required date fields to classes table if they don't exist
DO $$ 
BEGIN
  -- Add start_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE classes ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  -- Add end_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE classes ADD COLUMN end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '6 months');
  END IF;

  -- Add check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'classes_dates_check'
  ) THEN
    ALTER TABLE classes ADD CONSTRAINT classes_dates_check CHECK (end_date >= start_date);
  END IF;
END $$;