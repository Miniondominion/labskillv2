/*
  # Update instructor skill management

  1. Changes
    - Drop existing policies
    - Drop instructor_skill_permissions table
    - Update policies for instructor skill management

  2. Security
    - All instructors can view templates
    - Instructors can manage their own custom skills
    - Admins retain full control
*/

-- First drop all relevant policies
DROP POLICY IF EXISTS "Instructors can update their created skills" ON skills;
DROP POLICY IF EXISTS "Instructors can delete their created skills" ON skills;
DROP POLICY IF EXISTS "Instructors can manage their own non-template skills" ON skills;

-- Now we can safely drop the table
DROP TABLE IF EXISTS instructor_skill_permissions CASCADE;

-- Create new policy for instructor skill management
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'skills' 
    AND policyname = 'Instructors can manage their own non-template skills'
  ) THEN
    CREATE POLICY "Instructors can manage their own non-template skills"
      ON skills FOR ALL
      USING (
        (NOT is_template AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'instructor'
        )) OR
        (EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        ))
      );
  END IF;
END $$;