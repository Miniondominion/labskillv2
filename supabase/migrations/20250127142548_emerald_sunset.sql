/*
  # Add instructor permissions for categories

  1. Changes
    - Add policy to allow instructors to manage categories
    - Keep existing admin permissions intact
    
  2. Security
    - Instructors can now create, read, update, and delete categories
    - Admin permissions remain unchanged
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Only admins can manage skill categories" ON skill_categories;

-- Create new policy for category management
CREATE POLICY "Admins and instructors can manage skill categories"
  ON skill_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'instructor')
    )
  );