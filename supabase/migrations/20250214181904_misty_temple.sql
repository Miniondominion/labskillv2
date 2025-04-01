-- Add evaluated_student_id to skill_logs table
ALTER TABLE skill_logs
ADD COLUMN evaluated_student_id UUID REFERENCES profiles(id);

-- Create index for better performance
CREATE INDEX idx_skill_logs_evaluated_student ON skill_logs(evaluated_student_id);

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

-- Function to get classmates for a student
CREATE OR REPLACE FUNCTION get_student_classmates(p_student_id UUID)
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
    c.id AS class_id,
    c.name AS class_name
  FROM profiles p
  JOIN class_enrollments ce ON ce.student_id = p.id
  JOIN classes c ON c.id = ce.class_id
  WHERE c.id IN (
    SELECT class_id 
    FROM class_enrollments 
    WHERE student_id = p_student_id
  )
  AND p.id != p_student_id
  AND p.role = 'student'
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;