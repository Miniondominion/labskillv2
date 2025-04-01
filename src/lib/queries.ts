import { supabase } from './supabase';
import type { Database, TableName, Row, Insert, Update } from './database.types';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

// Generic query builder with caching
export async function query<T extends TableName>(
  table: T,
  options: {
    select?: string;
    match?: Partial<Row<T>>;
    single?: boolean;
    cache?: boolean;
    ttl?: number;
  } = {}
) {
  const { select = '*', match, single = false, cache: useCache = false, ttl = CACHE_TTL } = options;

  // Generate cache key
  const cacheKey = `${table}:${select}:${JSON.stringify(match)}:${single}`;

  // Check cache
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
  }

  // Build query
  let query = supabase.from(table).select(select);

  // Add filters
  if (match) {
    Object.entries(match).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  // Execute query
  const { data, error } = single
    ? await query.single()
    : await query;

  if (error) throw error;

  // Update cache
  if (useCache) {
    cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  return data;
}

// Batch loader for related data
export async function batchLoad<T extends TableName>(
  table: T,
  ids: string[],
  options: {
    column?: string;
    select?: string;
  } = {}
) {
  const { column = 'id', select = '*' } = options;

  if (!ids.length) return [];

  // Split into chunks of 100 to avoid query size limits
  const chunkSize = 100;
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
    .filter(Boolean);
}

// Insert with validation
export async function insert<T extends TableName>(
  table: T,
  data: Insert<T> | Insert<T>[]
) {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select();

  if (error) throw error;
  return result;
}

// Update with validation
export async function update<T extends TableName>(
  table: T,
  match: Partial<Row<T>>,
  data: Update<T>
) {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .match(match)
    .select();

  if (error) throw error;
  return result;
}

// Delete with validation
export async function remove<T extends TableName>(
  table: T,
  match: Partial<Row<T>>
) {
  const { data: result, error } = await supabase
    .from(table)
    .delete()
    .match(match)
    .select();

  if (error) throw error;
  return result;
}

// Clear cache
export function clearCache(pattern?: string) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.startsWith(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}