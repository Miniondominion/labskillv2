/*
  # Rename required_attempts to required_submissions

  1. Changes
    - Rename required_attempts column to required_submissions in skills table
    - Update column default value and constraints

  2. Security
    - No security changes needed
*/

-- Rename required_attempts to required_submissions
ALTER TABLE skills RENAME COLUMN required_attempts TO required_submissions;