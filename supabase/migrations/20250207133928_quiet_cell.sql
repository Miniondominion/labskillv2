/*
  # Add Instructor Code to Profiles

  1. Changes
    - Add instructor_code column to profiles table
    - Create function to generate random instructor code
    - Create trigger to auto-generate code for instructors
  
  2. Security
    - Only instructors and admins can view instructor codes
    - Codes are automatically generated and immutable
*/

-- Function to generate random instructor code
CREATE OR REPLACE FUNCTION generate_instructor_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding similar looking characters
  code TEXT := '';
  i INTEGER;
  random_char CHAR(1);
BEGIN
  -- Generate 6 character code
  FOR i IN 1..6 LOOP
    random_char := substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    code := code || random_char;
  END LOOP;
  
  -- Add dashes for readability (XX-XXXX)
  RETURN substr(code, 1, 2) || '-' || substr(code, 3);
END;
$$ LANGUAGE plpgsql;

-- Add instructor_code column
ALTER TABLE profiles
ADD COLUMN instructor_code TEXT UNIQUE;

-- Create index for better performance
CREATE INDEX idx_profiles_instructor_code ON profiles(instructor_code);

-- Function to handle instructor code generation
CREATE OR REPLACE FUNCTION handle_instructor_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Only generate code for instructors
  IF NEW.role = 'instructor' AND NEW.instructor_code IS NULL THEN
    LOOP
      -- Generate a new code
      new_code := generate_instructor_code();
      
      -- Check if code already exists
      SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE instructor_code = new_code
      ) INTO code_exists;
      
      -- Exit loop if unique code found
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    NEW.instructor_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for instructor code generation
CREATE TRIGGER generate_instructor_code_trigger
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_instructor_code();

-- Add policies for instructor code access
CREATE POLICY "Instructors can view own instructor code"
  ON profiles
  FOR SELECT
  USING (
    (auth.uid() = id AND role = 'instructor') OR
    role = 'admin'
  );

-- Add RLS for instructor_code column
ALTER TABLE profiles
  ENABLE ROW LEVEL SECURITY;