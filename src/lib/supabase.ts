import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage,
    storageKey: 'lab-skills-auth',
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-application-name': 'lab-skills-app'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

// Function to get cached data or fetch from database
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && now - cached.timestamp < ttl) {
    return cached.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}

// Function to invalidate cache
export function invalidateCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// Batch loader for related data
export async function batchLoadRelations<T>(
  table: string,
  ids: string[],
  column: string = 'id',
  select: string = '*'
): Promise<T[]> {
  if (!ids.length) return [];

  // Split into chunks of 10 to avoid query size limits
  const chunkSize = 10;
  const chunks = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }

  // Execute queries in parallel
  const results = await Promise.all(
    chunks.map(chunk => 
      supabase
        .from(table)
        .select(select)
        .in(column, chunk)
    )
  );

  // Combine and filter out errors
  return results
    .flatMap(result => result.data || [])
    .filter((item): item is T => item !== null);
}

// Type-safe query builder
export function createQuery<T extends keyof Database['public']['Tables']>(table: T) {
  return {
    select: <S extends string>(columns: S) => 
      supabase
        .from(table)
        .select(columns) as unknown as Promise<{
          data: Pick<Database['public']['Tables'][T]['Row'], S extends keyof Database['public']['Tables'][T]['Row'] ? S : never>[]
          error: null
        }>,
    insert: (values: Database['public']['Tables'][T]['Insert']) =>
      supabase
        .from(table)
        .insert(values),
    update: (values: Database['public']['Tables'][T]['Update']) =>
      supabase
        .from(table)
        .update(values),
    delete: () =>
      supabase
        .from(table)
        .delete()
  };
}