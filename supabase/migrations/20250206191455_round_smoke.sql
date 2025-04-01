/*
  # Add Remove Student Affiliation Function
  
  1. New Function
    - `remove_student_affiliation`: Handles atomic removal of student affiliation and class enrollments
    
  2. Description
    - Takes student ID, instructor ID, and array of class IDs as parameters
    - Removes student from specified classes
    - Removes instructor affiliation
    - All operations are performed in a single transaction
    
  3. Security
    - Function can only be executed by authenticated users
    - Includes role and affiliation checks
*/

CREATE OR REPLACE FUNCTION remove_student_affiliation(
  p_student_id UUID,
  p_instructor_id UUID,
  p_class_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the student is actually affiliated with this instructor
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_student_id
    AND affiliated_instructor = p_instructor_id
    AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Student is not affiliated with this instructor';
  END IF;

  -- Start transaction
  BEGIN
    -- Remove class enrollments first
    DELETE FROM class_enrollments
    WHERE student_id = p_student_id
    AND class_id = ANY(p_class_ids);

    -- Remove instructor affiliation
    UPDATE profiles
    SET affiliated_instructor = NULL
    WHERE id = p_student_id
    AND affiliated_instructor = p_instructor_id
    AND role = 'student';

    -- Verify the update was successful
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = p_student_id
      AND affiliated_instructor = p_instructor_id
    ) THEN
      RAISE EXCEPTION 'Failed to remove instructor affiliation';
    END IF;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remove_student_affiliation TO authenticated;