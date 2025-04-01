import { batchLoadRelations } from './supabase';

// Retry configuration
const MAX_RETRIES = 5; // Increased from 3 to 5 for more resilience
const INITIAL_DELAY = 1000; // 1 second
const MAX_DELAY = 10000; // 10 seconds
const JITTER = 100; // Add randomness to prevent thundering herd

// Network error patterns to match
const NETWORK_ERRORS = [
  'Failed to fetch',
  'NetworkError',
  'Network request failed',
  'Network Error',
  'rate limit',
  'socket hang up',
  'connection refused',
  'network timeout'
];

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  initialDelay = INITIAL_DELAY
): Promise<T> {
  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Only retry on network errors
      if (!NETWORK_ERRORS.some(msg => lastError.message.toLowerCase().includes(msg.toLowerCase()))) {
        throw lastError;
      }

      // Last attempt - throw the error
      if (attempt === maxRetries - 1) {
        console.error(`All retry attempts failed for operation:`, lastError);
        throw new Error('Operation failed after multiple retries. Please check your connection and try again.');
      }

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * JITTER;
      
      // Calculate delay with exponential backoff and jitter
      delay = Math.min(delay * 1.5 + jitter, MAX_DELAY);

      // Log retry attempt (but not in production)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Retrying operation, attempt ${attempt + 1} of ${maxRetries}. Waiting ${delay}ms...`);
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Helper to determine if an error is a network error
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return NETWORK_ERRORS.some(msg => 
    error.message.toLowerCase().includes(msg.toLowerCase())
  );
}

// Helper to format error messages for display
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (isNetworkError(error)) {
      return 'Connection error. Please check your internet connection and try again.';
    }
    // Clean up error message for display
    return error.message
      .replace(/^error:/i, '')
      .replace(/^\w+:/i, '')
      .trim();
  }
  return 'An unexpected error occurred';
}

// Helper to handle Supabase errors
export function handleSupabaseError(error: unknown): never {
  if (error instanceof Error) {
    // Check if it's a network error
    if (isNetworkError(error)) {
      throw new Error('Connection error. Please check your internet connection and try again.');
    }
    // Handle Supabase-specific errors
    if (error.message.includes('JWT')) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (error.message.includes('permission denied')) {
      throw new Error('You do not have permission to perform this action.');
    }
    throw error;
  }
  throw new Error('An unexpected error occurred');
}

// Function to chunk an array into smaller arrays
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}