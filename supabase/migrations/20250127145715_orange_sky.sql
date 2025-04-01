/*
  # Skill Assignments Schema

  1. New Tables
    - `skill_assignments`
      - `id` (uuid, primary key)
      - `skill_id` (uuid, foreign key)
      - `student_id` (uuid, foreign key)
      - `status` (enum: pending, completed, expired)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for students to view their assignments
    - Add policies for instructors to manage assignments

  3. Performance
    - Add indexes for common queries
    - Add trigger for updated_at
*/

-- Drop existing table and type if they exist
DROP TABLE IF EXISTS skill_assignments CASCADE;
DROP TYPE IF EXISTS skill_assignment_status CASCADE;

-- Create skill assignment status type
CREATE TYPE skill_assignment_status AS ENUM ('pending', 'completed', 'expired');

-- Create skill assignments table
CREATE TABLE skill_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status skill_assignment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, skill_id)
);

-- Enable RLS
ALTER TABLE skill_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Students can view their own assignments"
    ON skill_assignments FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Instructors can view and manage assignments for their students"
    ON skill_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = skill_assignments.student_id
            AND p.instructor_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_skill_assignments_student ON skill_assignments(student_id);
CREATE INDEX idx_skill_assignments_skill ON skill_assignments(skill_id);
CREATE INDEX idx_skill_assignments_status ON skill_assignments(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_skill_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_skill_assignments_updated_at
    BEFORE UPDATE ON skill_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_assignments_updated_at();