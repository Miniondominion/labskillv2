-- Add evaluated_student_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_logs' 
    AND column_name = 'evaluated_student_id'
  ) THEN
    ALTER TABLE skill_logs
    ADD COLUMN evaluated_student_id UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_skill_logs_evaluated_student 
ON skill_logs(evaluated_student_id);

-- Update policies to handle peer evaluation
DROP POLICY IF EXISTS "Students can update their pending logs" ON skill_logs;
CREATE POLICY "Students can update their pending logs"
  ON skill_logs FOR UPDATE
  USING (
    (student_id = auth.uid() AND status = 'submitted') OR
    (evaluated_student_id = auth.uid() AND status = 'submitted')
  );

DROP POLICY IF EXISTS "Students can view their own logs" ON skill_logs;
CREATE POLICY "Students can view their own logs"
  ON skill_logs FOR SELECT
  USING (
    student_id = auth.uid() OR
    evaluated_student_id = auth.uid()
  );

-- Drop function if it exists
DROP FUNCTION IF EXISTS get_student_classmates(UUID);

-- Create improved function to get classmates
CREATE FUNCTION get_student_classmates(p_student_id UUID)
RETURNS TABLE (
  student_id UUID,
  full_name TEXT,
  email TEXT,
  class_id UUID,
  class_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id AS student_id,
    p.full_name,
    p.email,
    ce2.class_id,
    c.name AS class_name
  FROM class_enrollments ce1
  JOIN classes c ON c.id = ce1.class_id
  JOIN class_enrollments ce2 ON ce2.class_id = ce1.class_id
  JOIN profiles p ON p.id = ce2.student_id
  WHERE ce1.student_id = p_student_id
  AND ce2.student_id != p_student_id
  AND p.role = 'student'
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;