/*
  # Update instructor skill permissions foreign key

  1. Changes
    - Modify foreign key constraint on instructor_skill_permissions to cascade deletes
    - This ensures that when a skill is deleted, all related permissions are automatically deleted

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- First drop the existing foreign key constraint
ALTER TABLE instructor_skill_permissions 
  DROP CONSTRAINT IF EXISTS instructor_skill_permissions_skill_id_fkey;

-- Re-create the constraint with ON DELETE CASCADE
ALTER TABLE instructor_skill_permissions
  ADD CONSTRAINT instructor_skill_permissions_skill_id_fkey 
  FOREIGN KEY (skill_id) 
  REFERENCES skills(id) 
  ON DELETE CASCADE;