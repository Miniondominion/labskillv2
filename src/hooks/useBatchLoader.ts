import { useState, useEffect } from 'react';
import { batchLoadRelations } from '../lib/supabase';

export function useBatchLoader<T>(
  table: string,
  ids: string[],
  column: string = 'id',
  select: string = '*',
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const results = await batchLoadRelations<T>(table, ids, column, select);
        if (mounted) {
          setData(results);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load data'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (ids.length > 0) {
      loadData();
    } else {
      setData([]);
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [...dependencies, JSON.stringify(ids)]);

  return { data, loading, error };
}