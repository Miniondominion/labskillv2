import { useState, useEffect } from 'react';
import { query, TableName, Row } from '../lib/queries';

export function useQuery<T extends TableName>(
  table: T,
  options: {
    select?: string;
    match?: Partial<Row<T>>;
    single?: boolean;
    cache?: boolean;
    ttl?: number;
    dependencies?: any[];
  } = {}
) {
  const { dependencies = [], ...queryOptions } = options;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await query(table, queryOptions);
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [...dependencies, table, JSON.stringify(queryOptions)]);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await query(table, { ...queryOptions, cache: false });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
}