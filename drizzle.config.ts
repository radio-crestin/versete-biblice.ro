import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

// Use local database in development or when Turso URL is not set
const useLocal = !process.env.TURSO_DATABASE_URL || process.env.NODE_ENV === 'development';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: useLocal ? 'sqlite' : 'turso',
  dbCredentials: useLocal
    ? { url: 'local.db' }
    : {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      },
});
