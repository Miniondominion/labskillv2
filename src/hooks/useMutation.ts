import { useState } from 'react';
import { insert, update, remove, TableName, Row, Insert, Update } from '../lib/queries';
import { clearCache } from '../lib/queries';

type MutationOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  invalidateQueries?: string[];
};

export function useMutation<T extends TableName>(
  type: 'insert' | 'update' | 'delete',
  table: T,
  options: MutationOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    data: Insert<T> | Update<T> | Partial<Row<T>>,
    match?: Partial<Row<T>>
  ) => {
    try {
      setLoading(true);
      setError(null);

      let result;
      switch (type) {
        case 'insert':
          result = await insert(table, data as Insert<T>);
          break;
        case 'update':
          if (!match) throw new Error('Match criteria required for update');
          result = await update(table, match, data as Update<T>);
          break;
        case 'delete':
          result = await remove(table, data as Partial<Row<T>>);
          break;
      }

      // Invalidate cached queries
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(pattern => clearCache(pattern));
      }

      options.onSuccess?.();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed');
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}