-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'saved_queries'
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage all queries" ON saved_queries;
    DROP POLICY IF EXISTS "Instructors can view saved queries" ON saved_queries;
  END IF;
END $$;

-- Create or update policies
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_saved_queries_created_by ON saved_queries(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_queries_created_at ON saved_queries(created_at);

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_saved_queries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_saved_queries_updated_at ON saved_queries;
CREATE TRIGGER update_saved_queries_updated_at
  BEFORE UPDATE ON saved_queries
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_queries_updated_at();