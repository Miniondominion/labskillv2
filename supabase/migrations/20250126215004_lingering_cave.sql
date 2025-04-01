/*
  # Drop category column from skills table

  1. Changes
    - Drop the old category column from skills table since we now use category_id
    - Ensure category_id is required

  2. Security
    - No security changes needed
*/

-- Drop the old category column
ALTER TABLE skills DROP COLUMN IF EXISTS category;

-- Ensure category_id is required
ALTER TABLE skills ALTER COLUMN category_id SET NOT NULL;