/*
  # Add admin role management policy

  1. Changes
    - Add policy to allow admins to update user roles
  
  2. Security
    - Only admins can update user roles
    - Maintains existing profile security
*/

-- Add policy for admins to update roles
CREATE POLICY "Admins can update user roles"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );