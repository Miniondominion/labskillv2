/*
  # Skills Management System Update

  1. Changes
    - Add skill categories table
    - Add instructor skill permissions table
    - Add RLS policies for new tables
    - Add performance indexes

  2. Security
    - Enable RLS on new tables
    - Add policies for admin management
    - Add policies for instructor access
*/

-- Create skill categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add category_id to skills table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skills' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE skills ADD COLUMN category_id UUID REFERENCES skill_categories(id);
  END IF;
END $$;

-- Create instructor skill permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS instructor_skill_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  skill_id UUID NOT NULL REFERENCES skills(id),
  granted_by UUID NOT NULL REFERENCES profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instructor_id, skill_id)
);

-- Enable RLS on new tables
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_skill_permissions ENABLE ROW LEVEL SECURITY;

-- Skill categories policies
CREATE POLICY "Skill categories are viewable by everyone"
  ON skill_categories FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage skill categories"
  ON skill_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Instructor skill permissions policies
CREATE POLICY "Instructor permissions are viewable by admins and relevant instructors"
  ON instructor_skill_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR id = instructor_skill_permissions.instructor_id
      )
    )
  );

CREATE POLICY "Only admins can manage instructor permissions"
  ON instructor_skill_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category_id);
CREATE INDEX IF NOT EXISTS idx_instructor_permissions_instructor ON instructor_skill_permissions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_permissions_skill ON instructor_skill_permissions(skill_id);