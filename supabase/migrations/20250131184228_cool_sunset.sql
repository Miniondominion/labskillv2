-- Function to update completed submissions count
CREATE OR REPLACE FUNCTION update_completed_submissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed_submissions in skill_assignments when a skill log is verified
  IF NEW.status = 'verified' THEN
    UPDATE skill_assignments
    SET completed_submissions = (
      SELECT COUNT(*)
      FROM skill_logs
      WHERE skill_id = NEW.skill_id
      AND student_id = NEW.student_id
      AND status = 'verified'
    )
    WHERE skill_id = NEW.skill_id
    AND student_id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update completed submissions
CREATE TRIGGER update_completed_submissions_trigger
  AFTER INSERT OR UPDATE ON skill_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_submissions();

-- Update existing completed submissions counts
DO $$
BEGIN
  UPDATE skill_assignments sa
  SET completed_submissions = (
    SELECT COUNT(*)
    FROM skill_logs sl
    WHERE sl.skill_id = sa.skill_id
    AND sl.student_id = sa.student_id
    AND sl.status = 'verified'
  );
END $$;