import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  fullWidth?: boolean;
};

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = '',
  fullWidth = false,
}: Props) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  const variantStyles = {
    primary: 'border border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-400',
    secondary: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500',
    danger: 'border border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400'
  }[variant];

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }[size];

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyle} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
          Loading...
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}