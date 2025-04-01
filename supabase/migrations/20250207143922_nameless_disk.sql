-- Create affiliation request status type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'affiliation_request_status') THEN
    CREATE TYPE affiliation_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- Create affiliation requests table
CREATE TABLE IF NOT EXISTS affiliation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status affiliation_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, instructor_id)
);

-- Enable RLS
ALTER TABLE affiliation_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_affiliation_requests_student ON affiliation_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_affiliation_requests_instructor ON affiliation_requests(instructor_id);
CREATE INDEX IF NOT EXISTS idx_affiliation_requests_status ON affiliation_requests(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_affiliation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_affiliation_requests_updated_at ON affiliation_requests;
CREATE TRIGGER update_affiliation_requests_updated_at
  BEFORE UPDATE ON affiliation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliation_requests_updated_at();

-- Create policies
DROP POLICY IF EXISTS "Students can view their own requests" ON affiliation_requests;
CREATE POLICY "Students can view their own requests"
  ON affiliation_requests
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can create pending requests" ON affiliation_requests;
CREATE POLICY "Students can create pending requests"
  ON affiliation_requests
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid() AND
    status = 'pending'
  );

DROP POLICY IF EXISTS "Instructors can view requests" ON affiliation_requests;
CREATE POLICY "Instructors can view requests"
  ON affiliation_requests
  FOR SELECT
  USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can update request status" ON affiliation_requests;
CREATE POLICY "Instructors can update request status"
  ON affiliation_requests
  FOR UPDATE
  USING (instructor_id = auth.uid());

-- Function to handle affiliation approval
CREATE OR REPLACE FUNCTION handle_affiliation_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If request is approved, update the student's affiliated_instructor
  IF NEW.status = 'approved' THEN
    -- Update the student's affiliated instructor
    UPDATE profiles
    SET affiliated_instructor = NEW.instructor_id
    WHERE id = NEW.student_id;

    -- Delete any other pending requests from this student
    DELETE FROM affiliation_requests
    WHERE student_id = NEW.student_id
    AND id != NEW.id
    AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for affiliation approval
DROP TRIGGER IF EXISTS handle_affiliation_approval_trigger ON affiliation_requests;
CREATE TRIGGER handle_affiliation_approval_trigger
  AFTER UPDATE ON affiliation_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION handle_affiliation_approval();