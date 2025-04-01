/*
  # Add function to get frequent skills

  1. New Functions
    - `get_frequent_skills`: Returns the most frequently used skills for a student
      - Takes student_id and limit as parameters
      - Returns skill_id and count of submissions
  
  This function helps with displaying the most frequently used skills on the student dashboard.
*/

-- Function to get the most frequently used skills for a student
CREATE OR REPLACE FUNCTION get_frequent_skills(
  p_student_id UUID,
  p_limit INTEGER DEFAULT 4
)
RETURNS TABLE (
  skill_id UUID,
  submission_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.skill_id,
    COUNT(*) as submission_count
  FROM 
    skill_logs sl
  WHERE 
    sl.student_id = p_student_id
  GROUP BY 
    sl.skill_id
  ORDER BY 
    submission_count DESC,
    MAX(sl.created_at) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_frequent_skills TO authenticated;