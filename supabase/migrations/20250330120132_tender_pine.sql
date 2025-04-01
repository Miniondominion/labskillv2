/*
  # Add Saved Queries Support

  1. New Tables
    - `saved_queries`: Stores admin-created query configurations
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `config` (jsonb)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Only admins can create/update/delete queries
    - Instructors can view saved queries
*/

-- Create saved queries table
CREATE TABLE saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE saved_queries ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_queries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_queries_updated_at
  BEFORE UPDATE ON saved_queries
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_queries_updated_at();

-- Create policies
CREATE POLICY "Admins can manage all queries"
  ON saved_queries
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Instructors can view saved queries"
  ON saved_queries
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
    )
  );

-- Create indexes
CREATE INDEX idx_saved_queries_created_by ON saved_queries(created_by);
CREATE INDEX idx_saved_queries_created_at ON saved_queries(created_at);