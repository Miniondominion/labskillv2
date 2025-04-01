-- First drop all policies that depend on status columns
DROP POLICY IF EXISTS "Students can update their pending logs" ON skill_logs;
DROP POLICY IF EXISTS "Students can view their own logs" ON skill_logs;
DROP POLICY IF EXISTS "Instructors can view and manage logs" ON skill_logs;

-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS update_skill_assignment_status_trigger ON skill_assignments;
DROP TRIGGER IF EXISTS update_completed_submissions_trigger ON skill_logs;
DROP FUNCTION IF EXISTS update_skill_assignment_status();
DROP FUNCTION IF EXISTS update_completed_submissions();

-- Drop existing types if they exist
DROP TYPE IF EXISTS skill_assignment_status CASCADE;
DROP TYPE IF EXISTS skill_log_status CASCADE;

-- Create new status types
CREATE TYPE skill_assignment_status AS ENUM ('pending', 'completed', 'expired');
CREATE TYPE skill_log_status AS ENUM ('pending', 'verified', 'rejected');

-- Add completed_submissions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_assignments' 
    AND column_name = 'completed_submissions'
  ) THEN
    ALTER TABLE skill_assignments ADD COLUMN completed_submissions INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create new status columns with temporary names
ALTER TABLE skill_assignments ADD COLUMN new_status skill_assignment_status NOT NULL DEFAULT 'pending';
ALTER TABLE skill_logs ADD COLUMN new_status skill_log_status NOT NULL DEFAULT 'pending';

-- Drop old status columns
ALTER TABLE skill_assignments DROP COLUMN IF EXISTS status;
ALTER TABLE skill_logs DROP COLUMN IF EXISTS status;

-- Rename new status columns to final names
ALTER TABLE skill_assignments RENAME COLUMN new_status TO status;
ALTER TABLE skill_logs RENAME COLUMN new_status TO status;

-- Update the skill assignment status trigger function
CREATE OR REPLACE FUNCTION update_skill_assignment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status to 'completed' if required submissions are met
    IF NEW.completed_submissions >= NEW.required_submissions THEN
        NEW.status = 'completed';
    -- Update status to 'expired' if due date has passed
    ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
        NEW.status = 'expired';
    -- Otherwise keep as pending
    ELSE
        NEW.status = 'pending';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status updates
CREATE TRIGGER update_skill_assignment_status_trigger
    BEFORE INSERT OR UPDATE ON skill_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_assignment_status();

-- Update the completed submissions trigger
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

-- Create trigger for completed submissions updates
CREATE TRIGGER update_completed_submissions_trigger
    AFTER INSERT OR UPDATE ON skill_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_completed_submissions();

-- Recreate policies
CREATE POLICY "Students can update their pending logs"
    ON skill_logs FOR UPDATE
    USING (
        student_id = auth.uid() AND
        status = 'pending'
    );

CREATE POLICY "Students can view their own logs"
    ON skill_logs FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Instructors can view and manage logs"
    ON skill_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'instructor'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skill_assignments_status ON skill_assignments(status);
CREATE INDEX IF NOT EXISTS idx_skill_logs_status ON skill_logs(status);
CREATE INDEX IF NOT EXISTS idx_skill_assignments_completed_submissions ON skill_assignments(completed_submissions);