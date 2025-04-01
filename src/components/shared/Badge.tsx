import { ReactNode } from 'react';

type BadgeVariant = 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink';

type Props = {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
};

export function Badge({ children, variant = 'gray', size = 'md', className = '' }: Props) {
  const baseStyles = 'inline-flex items-center rounded-full font-medium';
  
  const variantStyles = {
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    purple: 'bg-purple-100 text-purple-800',
    pink: 'bg-pink-100 text-pink-800'
  }[variant];

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  }[size];

  return (
    <span className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}>
      {children}
    </span>
  );
}