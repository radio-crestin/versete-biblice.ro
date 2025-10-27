import { db, translations, verses } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { BOOK_NAMES } from './book-names.js';
import { z } from 'zod';

/**
 * Cache for dynamic schema data
 */
let cachedTranslations: string[] = [];
let cachedLanguages: string[] = [];
let cachedBookSlugs: string[] = [];
let initialized = false;

/**
 * Initialize dynamic schema data
 * MUST be called before using any schema functions
 */
export async function initializeDynamicSchemas(): Promise<void> {
  if (initialized) {
    return;
  }

  // Fetch translations from database
  const results = await db
    .select({
      slug: translations.slug,
      language: translations.language
    })
    .from(translations)
    .all();

  cachedTranslations = results.map(r => r.slug);

  // Get unique languages
  const uniqueLanguages = new Set(results.map(r => r.language));
  cachedLanguages = Array.from(uniqueLanguages);

  // If no translations in DB, use defaults
  if (cachedTranslations.length === 0) {
    cachedTranslations = ['vdcc'];
    cachedLanguages = ['ron', 'eng'];
  }

  // Get all English book slugs from BOOK_NAMES
  cachedBookSlugs = Object.values(BOOK_NAMES).map(name =>
    name.toLowerCase().replace(/\s+/g, '-')
  );

  initialized = true;
}

/**
 * Get translation slugs (returns defaults if not initialized)
 */
export function getTranslationSlugs(): string[] {
  if (!initialized) {
    // Return default fallback value
    return ['vdcc'];
  }
  return cachedTranslations;
}

/**
 * Get available languages (returns defaults if not initialized)
 */
export function getLanguages(): string[] {
  if (!initialized) {
    // Return default fallback values
    return ['ron', 'eng'];
  }
  return cachedLanguages;
}

/**
 * Get all available book slugs (English)
 */
export function getBookSlugs(): string[] {
  if (!initialized) {
    // Return defaults from BOOK_NAMES
    return Object.values(BOOK_NAMES).map(name =>
      name.toLowerCase().replace(/\s+/g, '-')
    );
  }
  return cachedBookSlugs;
}

/**
 * Create dynamic PassageParamSchema with actual translation slugs from DB
 */
export function createDynamicPassageParamSchema() {
  const translationSlugs = getTranslationSlugs();

  return z.object({
    translationSlug: z.enum(translationSlugs as [string, ...string[]]).describe('Translation slug').openapi({
      param: {
        name: 'translationSlug',
        in: 'path',
      },
      example: translationSlugs[0] || 'vdcc',
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
      example: languages[0] || 'ron',
    }),
  });
}

/**
 * Clear cache (useful for testing or when data changes)
 */
export function clearSchemaCache() {
  cachedTranslations = [];
  cachedLanguages = [];
  cachedBookSlugs = [];
  initialized = false;
}
