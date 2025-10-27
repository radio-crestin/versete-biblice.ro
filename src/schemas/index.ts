import { z } from 'zod';

// Common schemas
export const ErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

export const SuccessSchema = z.object({
  success: z.literal(true),
});

// Translation schemas
export const TranslationSchema = z.object({
  id: z.number().describe('Unique translation ID'),
  slug: z.string().describe('URL-friendly translation identifier'),
  language: z.string().describe('Language code (e.g., ron, eng)'),
  abbreviation: z.string().describe('Translation abbreviation (e.g., rccv, kjv)'),
  name: z.string().describe('Full translation name'),
  totalBooks: z.number().describe('Total number of books'),
  totalChapters: z.number().describe('Total number of chapters'),
  totalVerses: z.number().describe('Total number of verses'),
  copyrightNotice: z.string().nullable().describe('Copyright information for the translation'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
});

export const TranslationsResponseSchema = SuccessSchema.extend({
  count: z.number().describe('Number of translations returned'),
  translations: z.array(TranslationSchema).describe('List of translations'),
});

export const TranslationResponseSchema = SuccessSchema.extend({
  translation: TranslationSchema.describe('Translation details'),
});

// Verse schemas for passages
export const VerseSchema = z.object({
  bookSlug: z.string().describe('English book slug (e.g., genesis, matthew, 1-samuel)'),
  bookName: z.string().describe('Localized book name (e.g., Geneza, Matei)'),
  chapter: z.number().describe('Chapter number'),
  verse: z.number().describe('Verse number'),
  text: z.string().describe('Verse text'),
});

export const PassageResponseSchema = SuccessSchema.extend({
  translationSlug: z.string().describe('Translation identifier'),
  translationId: z.number().describe('Translation ID'),
  start: z.object({
    book: z.string().describe('Start book slug'),
    chapter: z.number().describe('Start chapter number'),
    verse: z.number().describe('Start verse number'),
  }).describe('Passage start reference'),
  end: z.object({
    book: z.string().describe('End book slug'),
    chapter: z.number().describe('End chapter number'),
    verse: z.number().describe('End verse number'),
  }).describe('Passage end reference'),
  verses: z.array(VerseSchema).describe('List of verses in the passage (max 500)'),
  count: z.number().describe('Total number of verses returned (max 500)'),
});

// Parameter schemas
export const LanguageParamSchema = z.object({
  language: z.string().min(2).max(10).describe('Language code (e.g., ron, eng)').openapi({
    param: {
      name: 'language',
      in: 'path',
    },
    example: 'ro',
  }),
});

export const SlugParamSchema = z.object({
  slug: z.string().min(1).describe('Translation slug').openapi({
    param: {
      name: 'slug',
      in: 'path',
    },
    example: 'vdcc',
  }),
});

export const PassageParamSchema = z.object({
  translationSlug: z.string().min(1).describe('Translation slug').openapi({
    param: {
      name: 'translationSlug',
      in: 'path',
    },
    example: 'vdcc',
    examples: ['vdcc', 'kjv', 'nkjv', 'esv'],
  }),
});

export const PassageQuerySchema = z.object({
  book: z.string().min(1).describe('Start book - English slug (genesis, matthew) or localized name (geneza, matei)').openapi({
    example: 'genesis',
  }),
  chapter: z.string().regex(/^\d+$/).transform(Number).describe('Start chapter number').openapi({
    example: '1',
  }),
  verse: z.string().regex(/^\d+$/).transform(Number).describe('Start verse number').openapi({
    example: '1',
  }),
  endBook: z.string().optional().describe('End book - English slug or localized name (optional, defaults to start book)').openapi({
    example: 'genesis',
  }),
  endChapter: z.string().regex(/^\d+$/).transform(Number).optional().describe('End chapter number (optional, defaults to start chapter)').openapi({
    example: '2',
  }),
  endVerse: z.string().regex(/^\d+$/).transform(Number).optional().describe('End verse number (optional, defaults to start verse)').openapi({
    example: '3',
  }),
});
