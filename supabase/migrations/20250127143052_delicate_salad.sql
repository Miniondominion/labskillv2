/*
  # Class Management Schema

  1. New Tables
    - `classes`: Stores class information
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `instructor_id` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `archived` (boolean)
    
    - `class_enrollments`: Tracks student enrollments
      - `id` (uuid, primary key)
      - `class_id` (uuid, references classes)
      - `student_id` (uuid, references profiles)
      - `enrolled_at` (timestamptz)
      - `status` (text: active/inactive)

  2. Security
    - Enable RLS on both tables
    - Add policies for instructor access
    - Add policies for student access

  3. Indexes
    - Add indexes for performance optimization
*/

-- Create classes table if it doesn't exist
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived BOOLEAN NOT NULL DEFAULT false
);

-- Create class enrollments table if it doesn't exist
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  UNIQUE(class_id, student_id)
);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

-- Classes policies
CREATE POLICY "Classes are viewable by their instructor"
  ON classes FOR SELECT
  USING (instructor_id = auth.uid());

CREATE POLICY "Instructors can manage their own classes"
  ON classes FOR ALL
  USING (instructor_id = auth.uid());

-- Class enrollments policies
CREATE POLICY "Enrollments are viewable by class instructor"
  ON class_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage enrollments for their classes"
  ON class_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'classes' 
    AND indexname = 'idx_classes_instructor'
  ) THEN
    CREATE INDEX idx_classes_instructor ON classes(instructor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'class_enrollments' 
    AND indexname = 'idx_class_enrollments_class'
  ) THEN
    CREATE INDEX idx_class_enrollments_class ON class_enrollments(class_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'class_enrollments' 
    AND indexname = 'idx_class_enrollments_student'
  ) THEN
    CREATE INDEX idx_class_enrollments_student ON class_enrollments(student_id);
  END IF;
END $$;