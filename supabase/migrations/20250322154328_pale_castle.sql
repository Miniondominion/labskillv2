/*
  # Add sub-questions support to clinical form fields

  1. Changes
    - Add parent_field_id column to clinical_form_fields table
    - Add foreign key constraint referencing parent field
    - Add index for better performance
    - Add check constraint to prevent circular references
    
  2. Security
    - Maintains existing RLS policies
*/

-- Add parent_field_id column
ALTER TABLE clinical_form_fields
ADD COLUMN parent_field_id UUID REFERENCES clinical_form_fields(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_clinical_form_fields_parent 
ON clinical_form_fields(parent_field_id) 
WHERE parent_field_id IS NOT NULL;

-- Add check constraint to prevent self-referencing
ALTER TABLE clinical_form_fields
ADD CONSTRAINT clinical_form_fields_no_self_ref
CHECK (id != parent_field_id);

-- Add function to check for circular references
CREATE OR REPLACE FUNCTION check_circular_field_reference()
RETURNS TRIGGER AS $$
DECLARE
  current_parent UUID;
BEGIN
  -- Start with the immediate parent
  current_parent := NEW.parent_field_id;
  
  -- Follow the parent chain up to 100 levels (to prevent infinite loops)
  FOR i IN 1..100 LOOP
    -- Exit if we've reached the top level
    IF current_parent IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Check if we've found a circular reference
    IF current_parent = NEW.id THEN
      RAISE EXCEPTION 'Circular reference detected in field hierarchy';
    END IF;
    
    -- Move up to the next parent
    SELECT parent_field_id INTO current_parent
    FROM clinical_form_fields
    WHERE id = current_parent;
  END LOOP;
  
  -- If we get here, we've hit the maximum depth
  RAISE EXCEPTION 'Field hierarchy too deep (maximum 100 levels)';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check for circular references
CREATE TRIGGER check_circular_field_reference_trigger
BEFORE INSERT OR UPDATE ON clinical_form_fields
FOR EACH ROW
WHEN (NEW.parent_field_id IS NOT NULL)
EXECUTE FUNCTION check_circular_field_reference();