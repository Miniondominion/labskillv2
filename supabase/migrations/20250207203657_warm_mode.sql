-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create function to generate random email
CREATE OR REPLACE FUNCTION generate_student_email(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    first_name || '.' || last_name || 
    CAST(floor(random() * 999 + 1) AS TEXT) || 
    '@student.edu'
  );
END;
$$ LANGUAGE plpgsql;

-- Seed student data
DO $$
DECLARE
  first_names TEXT[] := ARRAY[
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 
    'Ethan', 'Isabella', 'Mason', 'Sophia', 'William',
    'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
    'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander',
    'Abigail', 'Michael', 'Emily', 'Daniel', 'Elizabeth'
  ];
  last_names TEXT[] := ARRAY[
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
    'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris'
  ];
  i INTEGER;
  student_id UUID;
  first_name TEXT;
  last_name TEXT;
  full_name TEXT;
  email TEXT;
BEGIN
  -- Create 25 student profiles
  FOR i IN 1..25 LOOP
    -- Generate random name
    first_name := first_names[i];
    last_name := last_names[i];
    full_name := first_name || ' ' || last_name;
    email := generate_student_email(first_name, last_name);
    
    -- Create auth.users entry
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      email,
      crypt('password123', gen_salt('bf')), -- Default password: password123
      NOW(),
      '{"provider":"email","providers":["email"]}',
      json_build_object('full_name', full_name),
      NOW(),
      NOW(),
      'authenticated',
      encode(gen_random_bytes(32), 'hex'),
      NULL,
      NULL,
      NULL
    ) RETURNING id INTO student_id;

    -- Create profile entry
    INSERT INTO profiles (
      id,
      role,
      full_name,
      email,
      created_at,
      updated_at
    ) VALUES (
      student_id,
      'student',
      full_name,
      email,
      NOW(),
      NOW()
    );
  END LOOP;
END $$;