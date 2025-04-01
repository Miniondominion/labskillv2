import { ValidationError } from './error';

export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      field: 'email',
      message: 'Please enter a valid email address'
    };
  }
  return null;
}

export function validatePassword(password: string): ValidationError | null {
  if (password.length < 6) {
    return {
      field: 'password',
      message: 'Password must be at least 6 characters long'
    };
  }
  return null;
}

export function validateRequired(value: unknown, fieldName: string): ValidationError | null {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return {
      field: fieldName.toLowerCase(),
      message: `${fieldName} is required`
    };
  }
  return null;
}

export function validateForm(values: Record<string, any>, rules: Record<string, (value: any) => ValidationError | null>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  Object.entries(rules).forEach(([field, validator]) => {
    const error = validator(values[field]);
    if (error) {
      errors.push(error);
    }
  });

  return errors;
}