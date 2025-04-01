import { useState, useCallback } from 'react';
import { handleError, handleSupabaseError, ValidationError } from '../utils/error';

export function useErrorHandler() {
  const [error, setError] = useState<string | ValidationError[] | null>(null);

  const handleApiError = useCallback((err: unknown) => {
    const errorMessage = handleError(err);
    setError(errorMessage);
    return errorMessage;
  }, []);

  const handleDatabaseError = useCallback((err: unknown) => {
    const errorMessage = handleSupabaseError(err);
    setError(errorMessage);
    return errorMessage;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    setError,
    handleApiError,
    handleDatabaseError,
    clearError
  };
}