import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { logger } from '../utils/logger.js';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client);

async function applySchemaMigration() {
  try {
    logger.info('Starting schema migration...');

    // Step 1: Drop book_id column
    logger.info('Dropping book_id column...');
    await client.execute('ALTER TABLE verses DROP COLUMN book_id');
    logger.info('✓ book_id column dropped');

    // Step 2: Create new indexes
    logger.info('Creating new indexes...');

    logger.info('Creating translation_book_name_idx...');
    await client.execute('CREATE INDEX IF NOT EXISTS translation_book_name_idx ON verses (translation_slug, book_name)');

    logger.info('Creating book_name_idx...');
    await client.execute('CREATE INDEX IF NOT EXISTS book_name_idx ON verses (book_name)');

    logger.info('✓ All indexes created');

    logger.info('='.repeat(60));
    logger.info('✓ Schema migration complete!');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('Schema migration failed:', error);
    throw error;
  }
}

applySchemaMigration()
  .then(() => {
    logger.info('Schema migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Schema migration failed:', error);
    process.exit(1);
  });
