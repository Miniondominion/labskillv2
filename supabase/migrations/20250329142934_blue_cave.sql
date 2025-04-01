/*
  # Add field_content column to clinical_form_fields

  1. Changes
    - Add field_content column to store rich text content for instruction fields
    - Add index for better query performance
    
  2. Security
    - Maintains existing RLS policies
*/

-- Add field_content column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinical_form_fields' 
    AND column_name = 'field_content'
  ) THEN
    ALTER TABLE clinical_form_fields
    ADD COLUMN field_content TEXT;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_clinical_form_fields_content 
ON clinical_form_fields(field_content) 
WHERE field_content IS NOT NULL;