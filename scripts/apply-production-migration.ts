#!/usr/bin/env tsx
/**
 * Script to manually apply the migration to production database
 * This is needed because drizzle-kit push doesn't use migration files
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  // Check for required environment variables
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error('❌ Missing required environment variables:');
    console.error('   TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    process.exit(1);
  }

  console.log('📦 Connecting to production database...');
  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../drizzle/0008_rename_translation_slug.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded:');
    console.log('   ' + migrationPath);
    console.log('');

    // Split the migration into individual statements
    // Remove comments first, then split by semicolons
    const cleanedSql = migrationSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`🔄 Applying ${statements.length} SQL statements...`);
    console.log('');

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`   [${i + 1}/${statements.length}] ${statement.substring(0, 60)}...`);
        try {
          await client.execute(statement + ';');
          console.log(`   ✓ Success`);
        } catch (error: any) {
          // If the error is about the index not existing, that's okay
          if (error.message && error.message.includes('no such index')) {
            console.log(`   ⚠️  Warning: ${error.message} (continuing...)`);
          } else if (error.message && error.message.includes('duplicate column')) {
            console.log(`   ⚠️  Warning: Column already exists (migration may have been partially applied)`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('');
    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📊 Verifying schema...');

    // Verify the migration worked
    const result = await client.execute(`
      SELECT sql FROM sqlite_master
      WHERE type = 'table' AND name = 'verses'
    `);

    if (result.rows.length > 0) {
      const tableSql = result.rows[0].sql as string;
      if (tableSql.includes('bible_translation_slug')) {
        console.log('✓ Column renamed successfully: translation_slug → bible_translation_slug');
      } else if (tableSql.includes('translation_slug')) {
        console.log('⚠️  Warning: Column still has old name, migration may need manual intervention');
      }
    }

    // Check indexes
    const indexes = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type = 'index' AND tbl_name = 'verses'
    `);

    console.log(`✓ Found ${indexes.rows.length} indexes on verses table`);
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

applyMigration();
