import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';

// Create client - use local database if Turso URL not provided or in development
const useLocal = (process.env.TURSO_DATABASE_URL ?? '') === '';

const client = createClient({
  url: useLocal ? 'file:local.db' : (process.env.TURSO_DATABASE_URL ?? ''),
  authToken: useLocal ? undefined : process.env.TURSO_AUTH_TOKEN,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export client for direct SQL queries if needed
export { client };
