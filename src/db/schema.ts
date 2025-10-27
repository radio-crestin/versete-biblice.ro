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
  translationSlug: text('translation_slug', { length: 50 }).notNull(), // e.g., 'vdcc', 'kjv'

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
    table.translationSlug,
    table.bookSlug,
    table.chapter,
    table.verse
  ),
  // Optimized composite indexes for common query patterns
  // Primary lookup pattern: translation + book + chapter + verse
  index('lookup_idx').on(
    table.translationSlug,
    table.bookSlug,
    table.chapter,
    table.verse
  ),
  // Translation + book queries (e.g., get all verses in a book)
  index('translation_book_idx').on(table.translationSlug, table.bookSlug),
  // Translation + book + chapter queries (e.g., get all verses in a chapter)
  index('translation_book_chapter_idx').on(
    table.translationSlug,
    table.bookSlug,
    table.chapter
  ),
  // Translation + bookName for searching by localized book name
  index('translation_book_name_idx').on(table.translationSlug, table.bookName),
  // Individual indexes for filtering
  index('translation_slug_idx').on(table.translationSlug),
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

  // Bible reference info
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
  // Index for fetching published quotes efficiently
  index('published_idx').on(table.published, table.publishedAt),
  // Index for user lookups (e.g., find all quotes by IP)
  index('client_ip_idx').on(table.clientIp),
  // Index for language filtering
  index('user_language_idx').on(table.userLanguage),
  // Composite index for published quotes ordered by publication date
  index('published_date_idx').on(table.published, table.publishedAt),
]);

// Type exports for TypeScript
export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;

export type Verse = typeof verses.$inferSelect;
export type NewVerse = typeof verses.$inferInsert;

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
