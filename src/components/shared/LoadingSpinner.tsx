import { Loader2 } from 'lucide-react';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function LoadingSpinner({ size = 'md', className = '' }: Props) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }[size];

  return (
    <div className="flex items-center justify-center">
      <Loader2 className={`animate-spin ${sizeClasses} ${className}`} />
    </div>
  );
}