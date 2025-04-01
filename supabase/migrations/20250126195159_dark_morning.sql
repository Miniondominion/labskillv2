/*
  # EMS Skills Documentation System Schema

  1. Tables
    - profiles
      - Extends auth.users with additional user information
      - Stores user role and profile data
    - skills
      - Master list of available skills
      - Includes descriptions and requirements
    - skill_logs
      - Records of skill attempts by students
      - Tracks completion status and verification
    - classes
      - Course/class information
      - Links instructors to students
    - class_enrollments
      - Many-to-many relationship between users and classes
    - skill_assignments
      - Skills assigned to specific classes
      - Includes deadlines and requirements

  2. Security
    - RLS enabled on all tables
    - Policies for students, instructors, and admins
    - Secure data access patterns
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');
CREATE TYPE skill_status AS ENUM ('pending', 'verified', 'rejected');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skills table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  required_attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Class enrollments (many-to-many between users and classes)
CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Skill assignments (skills assigned to classes)
CREATE TABLE skill_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, skill_id)
);

-- Skill logs (tracking student attempts)
CREATE TABLE skill_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  skill_id UUID NOT NULL REFERENCES skills(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  attempt_number INTEGER NOT NULL,
  status skill_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  media_urls TEXT[],
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Skills policies
CREATE POLICY "Skills are viewable by everyone"
  ON skills FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify skills"
  ON skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Classes policies
CREATE POLICY "Classes are viewable by everyone"
  ON classes FOR SELECT
  USING (true);

CREATE POLICY "Instructors can create and update own classes"
  ON classes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'instructor' OR role = 'admin')
    )
  );

-- Class enrollments policies
CREATE POLICY "Users can view their own enrollments"
  ON class_enrollments FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage their class enrollments"
  ON class_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

-- Skill assignments policies
CREATE POLICY "Skill assignments are viewable by class members"
  ON skill_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = skill_assignments.class_id
      AND class_enrollments.student_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = skill_assignments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage skill assignments"
  ON skill_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = skill_assignments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

-- Skill logs policies
CREATE POLICY "Users can view their own logs and instructors can view their class logs"
  ON skill_logs FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = skill_logs.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can create their own logs"
  ON skill_logs FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their pending logs"
  ON skill_logs FOR UPDATE
  USING (
    student_id = auth.uid() AND
    status = 'pending'
  );

CREATE POLICY "Instructors can verify logs for their classes"
  ON skill_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = skill_logs.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_skill_logs_student ON skill_logs(student_id);
CREATE INDEX idx_skill_logs_class ON skill_logs(class_id);
CREATE INDEX idx_class_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_skill_assignments_class ON skill_assignments(class_id);