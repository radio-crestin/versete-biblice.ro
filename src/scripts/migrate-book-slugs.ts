import { db, verses } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { getBookSlug } from '../utils/slugify.js';
import { logger } from '../utils/logger.js';

/**
 * Migration script to update book_slug from language-specific to English-based
 * This must run BEFORE removing the book_id column from the schema
 */
async function migrateBookSlugs() {
  try {
    logger.info('Starting book_slug migration...');
    logger.info('This will convert all book_slug values from language-specific to English-based slugs');

    // Get all unique book_id values from the database
    const allVerses = await db
      .select({ id: verses.id, bookId: verses.bookId, bookSlug: verses.bookSlug })
      .from(verses)
      .all();

    logger.info(`Found ${allVerses.length} verses to update`);

    // Group by bookId to show migration plan
    const bookMap = new Map<string, { oldSlug: string; newSlug: string; count: number }>();

    for (const verse of allVerses) {
      if (!bookMap.has(verse.bookId)) {
        const newSlug = getBookSlug(verse.bookId);
        bookMap.set(verse.bookId, {
          oldSlug: verse.bookSlug,
          newSlug,
          count: 0,
        });
      }
      const book = bookMap.get(verse.bookId)!;
      book.count++;
    }

    // Display migration plan
    logger.info('\nMigration plan:');
    logger.info('=' .repeat(60));
    for (const [bookId, info] of bookMap.entries()) {
      logger.info(`${bookId}: "${info.oldSlug}" → "${info.newSlug}" (${info.count} verses)`);
    }
    logger.info('=' .repeat(60));

    // Update verses in bulk per book_id for efficiency
    let updated = 0;

    for (const [bookId, info] of bookMap.entries()) {
      logger.info(`Updating ${bookId}: ${info.count} verses...`);

      await db
        .update(verses)
        .set({ bookSlug: info.newSlug })
        .where(eq(verses.bookId, bookId));

      updated += info.count;
      logger.info(`✓ Completed ${bookId}: ${updated}/${allVerses.length} verses updated`);
    }

    logger.info('\n' + '='.repeat(60));
    logger.info(`✓ Migration complete! Updated ${updated} verses`);
    logger.info('All book_slug values are now English-based');
    logger.info('You can now safely push the schema changes to remove book_id');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateBookSlugs()
  .then(() => {
    logger.info('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });
