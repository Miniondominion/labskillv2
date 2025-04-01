import { AlertCircle } from 'lucide-react';
import { ValidationError } from '../../utils/error';

type Props = {
  error: string | ValidationError[] | null;
  className?: string;
};

export function ErrorMessage({ error, className = '' }: Props) {
  if (!error) return null;

  const errors = Array.isArray(error) ? error : [{ field: '', message: error }];

  return (
    <div 
      className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <div className="ml-3">
          {errors.map((err, index) => (
            <p 
              key={index} 
              className="text-sm text-red-700"
            >
              {err.field ? `${err.field}: ${err.message}` : err.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}