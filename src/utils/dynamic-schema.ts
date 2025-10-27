/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { BOOK_NAMES } from './book-names.js';
import { z } from 'zod';
import translationsData from '../data/translations.json' with { type: 'json' };

/**
 * Load translations from static JSON file (generated at build time)
 */
const translations = translationsData.translations;
const cachedTranslations = translations.map(t => t.slug);
const uniqueLanguages = new Set(translations.map(t => t.language));
const cachedLanguages = Array.from(uniqueLanguages);
const cachedBookSlugs = Object.values(BOOK_NAMES).map(name =>
  name.toLowerCase().replace(/\s+/g, '-')
);

/**
 * Get translation slugs
 */
export function getTranslationSlugs(): string[] {
  return cachedTranslations;
}

/**
 * Get available languages
 */
export function getLanguages(): string[] {
  return cachedLanguages;
}

/**
 * Get all available book slugs (English)
 */
export function getBookSlugs(): string[] {
  return cachedBookSlugs;
}

/**
 * Create dynamic PassageParamSchema with actual translation slugs from DB
 */
export function createDynamicPassageParamSchema() {
  const translationSlugs = getTranslationSlugs();

  return z.object({
    bibleTranslationSlug: z.enum(translationSlugs as [string, ...string[]]).describe('Translation slug').openapi({
      param: {
        name: 'bibleTranslationSlug',
        in: 'path',
      },
      example: translationSlugs[0] ?? 'vdcc',
    }),
  });
}

/**
 * Create dynamic PassageQuerySchema with actual book slugs
 */
export function createDynamicPassageQuerySchema() {
  const bookSlugs = getBookSlugs();

  return z.object({
    book: z.enum(bookSlugs as [string, ...string[]]).describe('Start book - English slug (genesis, matthew, 1-samuel)').openapi({
      example: 'genesis',
    }),
    chapter: z.string().regex(/^\d+$/).transform(Number).describe('Start chapter number').openapi({
      example: '1',
    }),
    verse: z.string().regex(/^\d+$/).transform(Number).describe('Start verse number').openapi({
      example: '1',
    }),
    endBook: z.enum(bookSlugs as [string, ...string[]]).optional().describe('End book - English slug (optional, defaults to start book)').openapi({
      example: 'genesis',
    }),
    endChapter: z.string().regex(/^\d+$/).transform(Number).optional().describe('End chapter number (optional, defaults to start chapter)').openapi({
      example: '2',
    }),
    endVerse: z.string().regex(/^\d+$/).transform(Number).optional().describe('End verse number (optional, defaults to start verse)').openapi({
      example: '3',
    }),
  });
}

/**
 * Create dynamic TranslationsQuerySchema with actual languages from DB
 */
export function createDynamicTranslationsQuerySchema() {
  const languages = getLanguages();

  return z.object({
    language: z.enum(languages as [string, ...string[]]).optional().describe('Filter by language code').openapi({
      example: languages[0] ?? 'ron',
    }),
  });
}

/**
 * Create dynamic GetQuotesQuerySchema with actual translation slugs and filters
 */
export function createDynamicGetQuotesQuerySchema() {
  const translationSlugs = getTranslationSlugs();
  const bookSlugs = getBookSlugs();

  return z.object({
    bibleTranslationSlug: z.enum(translationSlugs as [string, ...string[]]).describe('Translation slug to retrieve verses in (e.g., "vdcc")').openapi({
      example: translationSlugs[0] ?? 'vdcc',
    }),
    startBook: z.enum(bookSlugs as [string, ...string[]]).optional().describe('Filter quotes starting from this book (optional)').openapi({
      example: 'genesis',
    }),
    endBook: z.enum(bookSlugs as [string, ...string[]]).optional().describe('Filter quotes ending at this book (optional)').openapi({
      example: 'exodus',
    }),
    startChapter: z.string().regex(/^\d+$/).transform(Number).optional().describe('Filter quotes starting from this chapter (optional)').openapi({
      example: '1',
    }),
    endChapter: z.string().regex(/^\d+$/).transform(Number).optional().describe('Filter quotes ending at this chapter (optional)').openapi({
      example: '5',
    }),
    startVerse: z.string().regex(/^\d+$/).transform(Number).optional().describe('Filter quotes starting from this verse (optional)').openapi({
      example: '1',
    }),
    endVerse: z.string().regex(/^\d+$/).transform(Number).optional().describe('Filter quotes ending at this verse (optional)').openapi({
      example: '10',
    }),
    limit: z.string().regex(/^\d+$/).default('50').transform(Number).describe('Maximum number of quotes to return (default: 50, max: 500)').openapi({
      example: '50',
    }),
    offset: z.string().regex(/^\d+$/).default('0').transform(Number).describe('Number of quotes to skip for pagination (default: 0)').openapi({
      example: '0',
    }),
    publishedAtGt: z.coerce.date().optional().describe('Filter quotes published after this date (ISO 8601 format)').openapi({
      example: '2025-01-01T00:00:00Z',
    }),
    publishedAtGte: z.coerce.date().optional().describe('Filter quotes published on or after this date (ISO 8601 format)').openapi({
      example: '2025-01-01T00:00:00Z',
    }),
    publishedAtLt: z.coerce.date().optional().describe('Filter quotes published before this date (ISO 8601 format)').openapi({
      example: '2025-12-31T23:59:59Z',
    }),
    publishedAtLte: z.coerce.date().optional().describe('Filter quotes published on or before this date (ISO 8601 format)').openapi({
      example: '2025-12-31T23:59:59Z',
    }),
  });
}

/**
 * Create dynamic GetDailyVerseQuerySchema with actual translation slugs
 */
export function createDynamicGetDailyVerseQuerySchema() {
  const translationSlugs = getTranslationSlugs();

  return z.object({
    bibleTranslationSlug: z.enum(translationSlugs as [string, ...string[]]).describe('Translation slug (e.g., "vdcc")').openapi({
      example: translationSlugs[0] ?? 'vdcc',
    }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Date for the daily verse (YYYY-MM-DD). Defaults to today if not provided.').openapi({
      example: '2025-12-25',
    }),
  });
}

/**
 * Create dynamic GetDailyVersesQuerySchema with actual translation slugs
 */
export function createDynamicGetDailyVersesQuerySchema() {
  const translationSlugs = getTranslationSlugs();

  return z.object({
    bibleTranslationSlug: z.enum(translationSlugs as [string, ...string[]]).describe('Translation slug (e.g., "vdcc")').openapi({
      example: translationSlugs[0] ?? 'vdcc',
    }),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date for range query (YYYY-MM-DD)').openapi({
      example: '2025-12-01',
    }),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date for range query (YYYY-MM-DD)').openapi({
      example: '2025-12-31',
    }),
  });
}

