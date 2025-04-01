import { ApiError, ValidationError } from '../utils/error';
import { User } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';

// Type guards for error handling
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

export function isValidationError(error: unknown): error is ValidationError[] {
  return (
    Array.isArray(error) &&
    error.every(
      (e): e is ValidationError =>
        typeof e === 'object' &&
        e !== null &&
        'field' in e &&
        'message' in e
    )
  );
}

// Type guards for user roles
export function isAdmin(user: User | null): boolean {
  return Boolean(
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin'
  );
}

export function isInstructor(user: User | null): boolean {
  return Boolean(
    user?.app_metadata?.role === 'instructor' ||
    user?.user_metadata?.role === 'instructor'
  );
}

export function isStudent(user: User | null): boolean {
  return Boolean(
    user?.app_metadata?.role === 'student' ||
    user?.user_metadata?.role === 'student'
  );
}

// Type guards for database types
export function isSkillLog(data: unknown): data is Database['public']['Tables']['skill_logs']['Row'] {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'student_id' in data &&
    'skill_id' in data
  );
}

export function isProfile(data: unknown): data is Database['public']['Tables']['profiles']['Row'] {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'role' in data &&
    'full_name' in data &&
    'email' in data
  );
}

// Type guard for checking if a value is a valid enum value
export function isEnumValue<T extends string>(value: unknown, enumValues: readonly T[]): value is T {
  return typeof value === 'string' && enumValues.includes(value as T);
}

// Type guard for checking if an object has required properties
export function hasRequiredProps<T extends object>(
  obj: unknown,
  props: (keyof T)[]
): obj is T {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    props.every(prop => prop in obj)
  );
}