#!/usr/bin/env tsx

import { migrate } from 'drizzle-orm/libsql/migrator';
import { db, client } from '../db/client.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    await migrate(db, { migrationsFolder: './drizzle' });

    logger.info('✓ Migrations completed successfully');

    await client.close();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    await client.close();
    process.exit(1);
  }
}

runMigrations();
