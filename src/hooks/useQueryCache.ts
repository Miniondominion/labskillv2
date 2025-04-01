import { useState, useEffect } from 'react';
import { getCachedData, invalidateCache } from '../lib/supabase';

export function useQueryCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  ttl?: number
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getCachedData(key, fetcher, ttl);
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
  }, [...dependencies, key]);

  const refresh = async () => {
    invalidateCache(key);
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
}