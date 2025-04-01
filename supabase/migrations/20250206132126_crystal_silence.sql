-- Rename instructor_id column to affiliated_instructor
ALTER TABLE profiles RENAME COLUMN instructor_id TO affiliated_instructor;

-- Drop existing foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_instructor_id_fkey;

-- Drop existing index
DROP INDEX IF EXISTS idx_profiles_instructor_id;

-- Create new foreign key constraint
ALTER TABLE profiles
ADD CONSTRAINT profiles_affiliated_instructor_fkey 
FOREIGN KEY (affiliated_instructor) 
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Create new index
CREATE INDEX idx_profiles_affiliated_instructor 
ON profiles(affiliated_instructor);