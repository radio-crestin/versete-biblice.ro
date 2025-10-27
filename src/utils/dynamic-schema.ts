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

