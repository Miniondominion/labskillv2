import { Search } from 'lucide-react';
import { ChangeEvent } from 'react';
import { ValidationError } from '../../utils/error';
import { WithClassName } from '../../types/common';

export type SearchInputProps = WithClassName<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string | ValidationError | null;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  'aria-label'?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  size?: 'sm' | 'md' | 'lg';
  debounce?: number;
  fullWidth?: boolean;
}>;

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  label,
  error,
  required = false,
  disabled = false,
  name,
  id,
  'aria-label': ariaLabel,
  onFocus,
  onBlur,
  size = 'md',
  debounce = 300,
  fullWidth = false
}: SearchInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message;

  const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-');

  const sizeClasses = {
    sm: 'py-1 text-sm',
    md: 'py-2',
    lg: 'py-3 text-lg'
  }[size];

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          id={inputId}
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className={`
            focus:ring-indigo-500 focus:border-indigo-500 
            block w-full pl-10 border-gray-300 rounded-md
            ${sizeClasses}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            ${error ? 'border-red-300' : ''}
            ${className}
          `}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      </div>
      {errorMessage && (
        <p 
          id={`${inputId}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}