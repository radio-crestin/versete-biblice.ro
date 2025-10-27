import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Translations table - stores Bible translation metadata
 * Each translation represents a unique Bible version (e.g., KJV, RCCV, ESV)
 */
export const translations = sqliteTable('translations', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Translation identifiers
  slug: text('slug', { length: 50 }).notNull().unique(), // URL-friendly slug (e.g., 'vdcc', 'kjv')
  language: text('language', { length: 10 }).notNull(), // ISO language code (e.g., 'ro', 'en')
  abbreviation: text('abbreviation', { length: 50 }).notNull(), // Translation abbreviation (e.g., 'rccv', 'kjv')
  name: text('name').notNull(), // Full translation name (e.g., 'Romanian Corrected Cornilescu Version')

  // Metadata
  totalBooks: integer('total_books').notNull().default(0),
  totalChapters: integer('total_chapters').notNull().default(0),
  totalVerses: integer('total_verses').notNull().default(0),
  copyrightNotice: text('copyright_notice'), // Copyright information for the translation

  // Timestamps
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Unique constraint on language + abbreviation combination
  uniqueIndex('unique_translation').on(table.language, table.abbreviation),
  // Indexes for faster lookups
  uniqueIndex('slug_idx').on(table.slug),
  index('language_idx').on(table.language),
  index('abbreviation_idx').on(table.abbreviation),
]);

/**
 * Verses table - stores all Bible verses with denormalized data for single-query lookups
 * Denormalization allows fetching verses without joins, optimizing for read performance
 */
export const verses = sqliteTable('verses', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Denormalized translation info for single-query lookups
  translationId: integer('translation_id').notNull().references(() => translations.id, { onDelete: 'cascade' }),
  bibleTranslationSlug: text('bible_translation_slug', { length: 50 }).notNull(), // e.g., 'vdcc', 'kjv'

  // Denormalized book info for single-query lookups
  bookSlug: text('book_slug', { length: 50 }).notNull(), // English book slug (e.g., 'genesis', 'matthew', '1-samuel')
  bookName: text('book_name', { length: 100 }).notNull(), // Book name in target language (e.g., 'Geneza', 'Matei')
  testament: text('testament', { length: 10 }).notNull(), // 'OT' or 'NT'

  // Verse location
  chapter: integer('chapter').notNull(),
  verse: integer('verse').notNull(),

  // Verse content
  text: text('text').notNull(),

  // Timestamps
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Unique constraint: one verse per translation/book/chapter/verse combination
  uniqueIndex('unique_verse').on(
    table.bibleTranslationSlug,
    table.bookSlug,
    table.chapter,
    table.verse
  ),
  // Optimized composite indexes for common query patterns
  // Primary lookup pattern: translation + book + chapter + verse
  index('lookup_idx').on(
    table.bibleTranslationSlug,
    table.bookSlug,
    table.chapter,
    table.verse
  ),
  // Translation + book queries (e.g., get all verses in a book)
  index('translation_book_idx').on(table.bibleTranslationSlug, table.bookSlug),
  // Translation + book + chapter queries (e.g., get all verses in a chapter)
  index('translation_book_chapter_idx').on(
    table.bibleTranslationSlug,
    table.bookSlug,
    table.chapter
  ),
  // Translation + bookName for searching by localized book name
  index('translation_book_name_idx').on(table.bibleTranslationSlug, table.bookName),
  // Individual indexes for filtering
  index('bible_translation_slug_idx').on(table.bibleTranslationSlug),
  index('book_slug_idx').on(table.bookSlug),
  index('book_name_idx').on(table.bookName),
]);

/**
 * Quotes table - stores user-created Bible quotes with references
 * Allows users to save and share specific Bible passages with notes
 */
export const quotes = sqliteTable('quotes', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // User info
  clientIp: text('client_ip').notNull(), // IP address of the user creating the quote
  userName: text('user_name'), // Optional display name

  // Bible reference info (translation-agnostic)
  reference: text('reference').notNull(), // Full reference string (e.g., "Genesis 1:1-5")
  startBook: text('start_book', { length: 50 }).notNull(), // Starting book slug
  endBook: text('end_book', { length: 50 }), // Ending book slug (null if same as startBook)
  startChapter: integer('start_chapter').notNull(),
  endChapter: integer('end_chapter'), // Null if same chapter
  startVerse: integer('start_verse').notNull(),
  endVerse: integer('end_verse'), // Null if single verse

  // User content
  userLanguage: text('user_language', { length: 10 }).notNull(), // ISO language code
  userNote: text('user_note'), // Optional user note about this quote

  // Publication status
  published: integer('published', { mode: 'boolean' }).notNull().default(false),

  // Timestamps
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  publishedAt: text('published_at'), // Timestamp when quote was published
}, (table) => [
  // Index for user lookups (e.g., find all quotes by IP)
  index('client_ip_idx').on(table.clientIp),
  // Index for language filtering
  index('user_language_idx').on(table.userLanguage),
  // Composite index for published quotes ordered by publication date
  index('published_date_idx').on(table.published, table.publishedAt),
  // Optimized indexes for filtering queries
  index('published_book_idx').on(table.published, table.startBook, table.publishedAt),
  index('published_book_chapter_idx').on(table.published, table.startBook, table.startChapter, table.publishedAt),
  index('published_book_chapter_verse_idx').on(table.published, table.startBook, table.startChapter, table.startVerse, table.publishedAt),
]);

/**
 * Daily Verse Pool table - stores the pool of Bible verses that can be scheduled
 * Used for the daily verse feature to maintain a collection of verses to rotate through
 */
export const dailyVersePool = sqliteTable('daily_verse_pool', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Bible reference info (translation-agnostic, similar to quotes)
  startBook: text('start_book', { length: 50 }).notNull(), // Starting book slug
  startChapter: integer('start_chapter').notNull(),
  startVerse: integer('start_verse').notNull(),
  endBook: text('end_book', { length: 50 }).notNull(), // Ending book slug
  endChapter: integer('end_chapter').notNull(),
  endVerse: integer('end_verse').notNull(),

  // Optional preferred publication date (MM-DD format, e.g., "12-25" for Christmas)
  publishDate: text('publish_date', { length: 5 }), // Format: "MM-DD"

  // Scheduling metadata
  lastScheduledAt: text('last_scheduled_at'), // Timestamp of last scheduling
  scheduleCount: integer('schedule_count').notNull().default(0), // Total times this verse has been scheduled

  // Timestamps
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Index for verses with specific publish dates
  index('publish_date_idx').on(table.publishDate),
  // Index for scheduling algorithm (find least recently scheduled)
  index('last_scheduled_idx').on(table.lastScheduledAt),
  index('schedule_count_idx').on(table.scheduleCount),
]);

/**
 * Daily Verse Scheduled table - stores the scheduled verses for specific dates
 * Maps dates to verses from the pool
 */
export const dailyVerseScheduled = sqliteTable('daily_verse_scheduled', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Date for this scheduled verse (YYYY-MM-DD format)
  date: text('date').notNull().unique(), // e.g., "2025-12-25"

  // Foreign key to the verse pool
  versePoolId: integer('verse_pool_id').notNull().references(() => dailyVersePool.id, { onDelete: 'cascade' }),

  // Timestamp
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Unique index on date (only one verse per day)
  uniqueIndex('unique_date_idx').on(table.date),
  // Index for date range queries
  index('date_idx').on(table.date),
  // Index for verse pool lookups
  index('verse_pool_idx').on(table.versePoolId),
]);

// Type exports for TypeScript
export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;

export type Verse = typeof verses.$inferSelect;
export type NewVerse = typeof verses.$inferInsert;

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;

export type DailyVersePool = typeof dailyVersePool.$inferSelect;
export type NewDailyVersePool = typeof dailyVersePool.$inferInsert;

export type DailyVerseScheduled = typeof dailyVerseScheduled.$inferSelect;
export type NewDailyVerseScheduled = typeof dailyVerseScheduled.$inferInsert;
