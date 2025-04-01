// Error types
export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, any>;
};

export type ValidationError = {
  field: string;
  message: string;
};

// Error classes
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'APP_ERROR',
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationErrors extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationErrors';
  }
}

// Error handling utilities
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationErrors {
  return error instanceof ValidationErrors;
}

export function handleError(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (isValidationError(error)) {
    return error.errors.map(e => e.message).join(', ');
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

// Network error patterns
const NETWORK_ERRORS = [
  'Failed to fetch',
  'NetworkError',
  'Network request failed',
  'Network Error',
  'socket hang up',
  'ECONNREFUSED',
  'connection refused',
  'network timeout'
];

export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return NETWORK_ERRORS.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Supabase error handling
export function handleSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    // Check for network errors
    if (isNetworkError(error)) {
      return 'Connection error. Please check your internet connection and try again.';
    }

    // Handle Supabase-specific errors
    if (error.message.includes('JWT')) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.message.includes('permission denied')) {
      return 'You do not have permission to perform this action.';
    }
    if (error.message.includes('duplicate key')) {
      return 'This record already exists.';
    }
    if (error.message.includes('foreign key')) {
      return 'This operation would break data relationships.';
    }

    return error.message;
  }

  return 'An unexpected error occurred';
}

// Export validation functions from validation.ts
export { validateEmail, validatePassword, validateRequired, validateForm } from './validation';