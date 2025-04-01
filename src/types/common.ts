import { ReactNode } from 'react';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type WithChildren<T = {}> = T & { children?: ReactNode };
export type WithClassName<T = {}> = T & { className?: string };

// Status types
export type Status = 'idle' | 'loading' | 'success' | 'error';
export type AsyncState<T> = {
  data: Nullable<T>;
  status: Status;
  error: Nullable<Error>;
};

// Form types
export type FormStatus = 'idle' | 'submitting' | 'submitted' | 'error';
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

// API response types
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

// Function types
export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;
export type ErrorHandler = (error: unknown) => void;
export type VoidFunction = () => void;

// UI types
export type Size = 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
export type Position = 'top' | 'right' | 'bottom' | 'left';

// Utility types for type-safe event handling
export type ChangeHandler<T = string> = (value: T) => void;
export type SubmitHandler<T = any> = (data: T) => Promise<void>;