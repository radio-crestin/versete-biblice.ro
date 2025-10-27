import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Translations table - stores Bible translation metadata
 * Each translation represents a unique Bible version (e.g., KJV, RCCV, ESV)
 */
export const translations = sqliteTable('translations', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Translation identifiers
  slug: text('slug', { length: 50 }).notNull().unique(), // URL-friendly slug (e.g., 'rccv', 'kjv')
  language: text('language', { length: 10 }).notNull(), // ISO language code (e.g., 'ron', 'eng')
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
}, (table) => ({
  // Unique constraint on language + abbreviation combination
  uniqueTranslation: uniqueIndex('unique_translation').on(table.language, table.abbreviation),
  // Indexes for faster lookups
  slugIdx: uniqueIndex('slug_idx').on(table.slug),
  languageIdx: index('language_idx').on(table.language),
  abbreviationIdx: index('abbreviation_idx').on(table.abbreviation),
}));

/**
 * Verses table - stores all Bible verses with denormalized data for single-query lookups
 * Denormalization allows fetching verses without joins, optimizing for read performance
 */
export const verses = sqliteTable('verses', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Denormalized translation info for single-query lookups
  translationId: integer('translation_id').notNull().references(() => translations.id, { onDelete: 'cascade' }),
  translationSlug: text('translation_slug', { length: 50 }).notNull(), // e.g., 'rccv', 'kjv'

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
}, (table) => ({
  // Unique constraint: one verse per translation/book/chapter/verse combination
  uniqueVerse: uniqueIndex('unique_verse').on(
    table.translationSlug,
    table.bookSlug,
    table.chapter,
    table.verse
  ),
  // Optimized composite indexes for common query patterns
  // Primary lookup pattern: translation + book + chapter + verse
  lookupIdx: index('lookup_idx').on(
    table.translationSlug,
    table.bookSlug,
    table.chapter,
    table.verse
  ),
  // Translation + book queries (e.g., get all verses in a book)
  translationBookIdx: index('translation_book_idx').on(table.translationSlug, table.bookSlug),
  // Translation + book + chapter queries (e.g., get all verses in a chapter)
  translationBookChapterIdx: index('translation_book_chapter_idx').on(
    table.translationSlug,
    table.bookSlug,
    table.chapter
  ),
  // Translation + bookName for searching by localized book name
  translationBookNameIdx: index('translation_book_name_idx').on(table.translationSlug, table.bookName),
  // Individual indexes for filtering
  translationSlugIdx: index('translation_slug_idx').on(table.translationSlug),
  bookSlugIdx: index('book_slug_idx').on(table.bookSlug),
  bookNameIdx: index('book_name_idx').on(table.bookName),
}));

// Type exports for TypeScript
export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;

export type Verse = typeof verses.$inferSelect;
export type NewVerse = typeof verses.$inferInsert;
