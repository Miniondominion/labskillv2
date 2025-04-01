-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "skill_logs_insert_policy" ON skill_logs;

-- Create new insert policy that allows all authenticated users to insert
CREATE POLICY "skill_logs_insert_policy"
  ON skill_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);