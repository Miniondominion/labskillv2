/*
  # Add skill form schema and related tables

  1. Changes
    - Add verification_type to skills table
    - Add form_schema JSONB column to skills table
    - Create skill questions table
    - Create skill responses table
    - Create skill signatures table
    - Add appropriate RLS policies

  2. Security
    - Enable RLS on all new tables
    - Add policies for admins and viewing permissions
*/

-- Add verification_type to skills table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skills' AND column_name = 'verification_type'
  ) THEN
    ALTER TABLE skills ADD COLUMN verification_type TEXT CHECK (verification_type IN ('peer', 'instructor')) NOT NULL DEFAULT 'peer';
  END IF;
END $$;

-- Add form_schema to skills table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skills' AND column_name = 'form_schema'
  ) THEN
    ALTER TABLE skills ADD COLUMN form_schema JSONB;
  END IF;
END $$;

-- Create skill questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('checkbox', 'text', 'number', 'multiple_choice')),
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create skill response options table if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES skill_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create skill signatures table if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  signature_data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE skill_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_signatures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop skill questions policies
  DROP POLICY IF EXISTS "Skill questions are viewable by everyone" ON skill_questions;
  DROP POLICY IF EXISTS "Only admins can manage skill questions" ON skill_questions;
  
  -- Drop skill responses policies
  DROP POLICY IF EXISTS "Skill responses are viewable by everyone" ON skill_responses;
  DROP POLICY IF EXISTS "Only admins can manage skill responses" ON skill_responses;
  
  -- Drop skill signatures policies
  DROP POLICY IF EXISTS "Skill signatures are viewable by everyone" ON skill_signatures;
  DROP POLICY IF EXISTS "Only admins can manage skill signatures" ON skill_signatures;
END $$;

-- Create new policies
CREATE POLICY "Skill questions are viewable by everyone"
  ON skill_questions FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage skill questions"
  ON skill_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Skill responses are viewable by everyone"
  ON skill_responses FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage skill responses"
  ON skill_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Skill signatures are viewable by everyone"
  ON skill_signatures FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage skill signatures"
  ON skill_signatures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skill_questions_skill ON skill_questions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_responses_question ON skill_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_skill_signatures_skill ON skill_signatures(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_signatures_instructor ON skill_signatures(instructor_id);