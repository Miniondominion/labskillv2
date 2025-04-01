import { ReactNode } from 'react';
import { ValidationError } from '../../utils/error';

type Props = {
  label: string;
  htmlFor: string;
  error?: string | ValidationError | null;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ 
  label, 
  htmlFor, 
  error, 
  required, 
  hint, 
  children,
  className = ''
}: Props) {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message;

  return (
    <div className={`bg-form-bg-50 p-4 rounded-lg ${className}`}>
      <label 
        htmlFor={htmlFor} 
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {children}
      </div>
      {hint && (
        <p className="mt-2 text-xs text-gray-500">{hint}</p>
      )}
      {errorMessage && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}