/*
  # Add skill templates functionality

  1. Changes
    - Add `is_template` boolean column to skills table
    - Add `template_id` column to skills table for tracking cloned templates
    - Update RLS policies to allow instructors to manage their own skills
    - Add new policy for template management

  2. Security
    - Only admins can manage templates
    - Instructors can create and manage their own skills
    - Everyone can view templates and skills
*/

-- Add template-related columns
ALTER TABLE skills 
ADD COLUMN is_template BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN template_id UUID REFERENCES skills(id);

-- Create index for better performance
CREATE INDEX idx_skills_template ON skills(template_id);

-- Update existing skills policies
DROP POLICY IF EXISTS "Only admins can modify skills" ON skills;

-- Create new policies for skills
CREATE POLICY "Templates are viewable by everyone"
  ON skills FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all skills and templates"
  ON skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Instructors can manage their own non-template skills"
  ON skills FOR INSERT
  WITH CHECK (
    NOT is_template AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
    )
  );

CREATE POLICY "Instructors can update their created skills"
  ON skills FOR UPDATE
  USING (
    NOT is_template AND
    EXISTS (
      SELECT 1 FROM instructor_skill_permissions
      WHERE skill_id = skills.id
      AND instructor_id = auth.uid()
    )
  )
  WITH CHECK (NOT is_template);

CREATE POLICY "Instructors can delete their created skills"
  ON skills FOR DELETE
  USING (
    NOT is_template AND
    EXISTS (
      SELECT 1 FROM instructor_skill_permissions
      WHERE skill_id = skills.id
      AND instructor_id = auth.uid()
    )
  );