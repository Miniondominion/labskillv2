/*
  # Enhance skills table with form capabilities

  1. New Fields
    - Add verification_type to skills table
    - Add form_schema for storing form configuration

  2. New Tables
    - skill_questions for storing form questions
    - skill_responses for storing response options
    - skill_signatures for storing instructor signatures

  3. Security
    - Enable RLS on new tables
    - Add policies to ensure only admins can create/modify skills
*/

-- Add verification_type to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS verification_type TEXT CHECK (verification_type IN ('peer', 'instructor')) NOT NULL DEFAULT 'peer';

-- Add form_schema to skills table for storing form configuration
ALTER TABLE skills ADD COLUMN IF NOT EXISTS form_schema JSONB;

-- Create skill questions table
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

-- Create skill response options table (for multiple choice questions)
CREATE TABLE IF NOT EXISTS skill_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES skill_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create skill signatures table
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

-- Policies for skill questions
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

-- Policies for skill responses
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

-- Policies for skill signatures
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