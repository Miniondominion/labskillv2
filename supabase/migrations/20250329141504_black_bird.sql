/*
  # Add Long Text and Instructions Field Types

  1. Changes
    - Update field_type check constraint to include new types
    - Add comment to explain field types
    
  2. Security
    - No changes to RLS policies needed
*/

-- Drop existing field_type check constraint
ALTER TABLE clinical_form_fields 
DROP CONSTRAINT IF EXISTS clinical_form_fields_field_type_check;

-- Add new field_type check constraint with additional types
ALTER TABLE clinical_form_fields
ADD CONSTRAINT clinical_form_fields_field_type_check
CHECK (field_type IN (
  'text',
  'longtext',
  'number', 
  'date', 
  'time', 
  'select', 
  'multiselect', 
  'checkbox',
  'instructions'
));

-- Add comment explaining field types
COMMENT ON COLUMN clinical_form_fields.field_type IS 
'Available field types:
- text: Single line text input
- longtext: Multi-line text area
- number: Numeric input
- date: Date picker
- time: Time picker
- select: Single select dropdown
- multiselect: Multiple select checkboxes
- checkbox: Single checkbox
- instructions: Static text/instructions (no input)';