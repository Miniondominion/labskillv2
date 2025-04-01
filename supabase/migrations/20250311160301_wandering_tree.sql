/*
  # Add Skill Subcategories

  1. New Tables
    - `skill_subcategories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category_id` (uuid, references skill_categories)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `subcategory_id` to `skills` table
    - Update existing skills to use subcategories

  3. Security
    - Enable RLS on `skill_subcategories` table
    - Add policies for admins and instructors
*/

-- Create skill_subcategories table
CREATE TABLE IF NOT EXISTS skill_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category_id uuid NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add subcategory_id to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES skill_subcategories(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_skill_subcategories_category ON skill_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_skills_subcategory ON skills(subcategory_id);

-- Enable RLS
ALTER TABLE skill_subcategories ENABLE ROW LEVEL SECURITY;

-- Policies for skill_subcategories
CREATE POLICY "Skill subcategories are viewable by everyone"
  ON skill_subcategories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins and instructors can manage skill subcategories"
  ON skill_subcategories
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'instructor')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_skill_subcategories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_skill_subcategories_updated_at
  BEFORE UPDATE ON skill_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_subcategories_updated_at();