-- Drop existing triggers first
DO $$ 
BEGIN
  -- Drop triggers if they exist
  DROP TRIGGER IF EXISTS update_portfolio_templates_updated_at ON portfolio_templates;
  DROP TRIGGER IF EXISTS update_portfolio_sections_updated_at ON portfolio_sections;
  DROP TRIGGER IF EXISTS update_portfolio_fields_updated_at ON portfolio_fields;
  DROP TRIGGER IF EXISTS update_portfolio_instances_updated_at ON portfolio_instances;
  DROP TRIGGER IF EXISTS update_portfolio_data_updated_at ON portfolio_data;
END $$;

-- Drop existing function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create or replace updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DO $$ 
BEGIN
  -- Create triggers for each table
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_portfolio_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_portfolio_templates_updated_at
      BEFORE UPDATE ON portfolio_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_portfolio_sections_updated_at'
  ) THEN
    CREATE TRIGGER update_portfolio_sections_updated_at
      BEFORE UPDATE ON portfolio_sections
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_portfolio_fields_updated_at'
  ) THEN
    CREATE TRIGGER update_portfolio_fields_updated_at
      BEFORE UPDATE ON portfolio_fields
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_portfolio_instances_updated_at'
  ) THEN
    CREATE TRIGGER update_portfolio_instances_updated_at
      BEFORE UPDATE ON portfolio_instances
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_portfolio_data_updated_at'
  ) THEN
    CREATE TRIGGER update_portfolio_data_updated_at
      BEFORE UPDATE ON portfolio_data
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Drop existing policies
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Admins can manage portfolio templates" ON portfolio_templates;
  DROP POLICY IF EXISTS "Everyone can view active templates" ON portfolio_templates;
  DROP POLICY IF EXISTS "Admins can manage portfolio sections" ON portfolio_sections;
  DROP POLICY IF EXISTS "Everyone can view portfolio sections" ON portfolio_sections;
  DROP POLICY IF EXISTS "Admins can manage portfolio fields" ON portfolio_fields;
  DROP POLICY IF EXISTS "Everyone can view portfolio fields" ON portfolio_fields;
  DROP POLICY IF EXISTS "Students can manage their own portfolio instances" ON portfolio_instances;
  DROP POLICY IF EXISTS "Instructors can view their students' portfolios" ON portfolio_instances;
  DROP POLICY IF EXISTS "Students can manage their own portfolio data" ON portfolio_data;
  DROP POLICY IF EXISTS "Instructors can view their students' portfolio data" ON portfolio_data;
END $$;

-- Create RLS policies
CREATE POLICY "Admins can manage portfolio templates"
  ON portfolio_templates
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view active templates"
  ON portfolio_templates
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage portfolio sections"
  ON portfolio_sections
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view portfolio sections"
  ON portfolio_sections
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage portfolio fields"
  ON portfolio_fields
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Everyone can view portfolio fields"
  ON portfolio_fields
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Students can manage their own portfolio instances"
  ON portfolio_instances
  FOR ALL
  TO public
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Instructors can view their students' portfolios"
  ON portfolio_instances
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = portfolio_instances.student_id
      AND affiliated_instructor = auth.uid()
    )
  );

CREATE POLICY "Students can manage their own portfolio data"
  ON portfolio_data
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_instances
      WHERE id = portfolio_data.instance_id
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can view their students' portfolio data"
  ON portfolio_data
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_instances pi
      JOIN profiles p ON p.id = pi.student_id
      WHERE pi.id = portfolio_data.instance_id
      AND p.affiliated_instructor = auth.uid()
    )
  );