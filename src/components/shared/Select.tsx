import { ChevronDown } from 'lucide-react';
import { ValidationError } from '../../utils/error';
import { WithClassName } from '../../types/common';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
};

export type SelectProps = WithClassName<{
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string | ValidationError | null;
  disabled?: boolean;
  name?: string;
  id?: string;
  'aria-label'?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}>;

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an option',
  className = '',
  required = false,
  error,
  disabled = false,
  name,
  id,
  'aria-label': ariaLabel,
  onFocus,
  onBlur,
  size = 'md',
  fullWidth = false
}: SelectProps) {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message;

  const selectId = id || name || label?.toLowerCase().replace(/\s+/g, '-');

  // Group options by group property if any options have groups
  const hasGroups = options.some(option => option.group);
  const groupedOptions = hasGroups
    ? options.reduce((acc, option) => {
        const group = option.group || '';
        if (!acc[group]) acc[group] = [];
        acc[group].push(option);
        return acc;
      }, {} as Record<string, SelectOption[]>)
    : null;

  const sizeClasses = {
    sm: 'py-1 text-sm',
    md: 'py-2',
    lg: 'py-3 text-lg'
  }[size];

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className={`
            block w-full pl-3 pr-10 border-gray-300 
            focus:outline-none focus:ring-indigo-500 
            focus:border-indigo-500 rounded-md
            appearance-none
            ${sizeClasses}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            ${error ? 'border-red-300' : ''}
            ${className}
          `}
          required={required}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {hasGroups && groupedOptions
            ? Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <optgroup key={group} label={group || 'Other'}>
                  {groupOptions.map((option) => (
                    <option 
                      key={option.value} 
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : options.map((option) => (
                <option 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
          }
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>
      </div>
      {errorMessage && (
        <p 
          id={`${selectId}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}