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
  bibleTranslationSlug: z.string().describe('Translation identifier'),
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
  bibleTranslationSlug: z.string().min(1).describe('Translation slug').openapi({
    param: {
      name: 'bibleTranslationSlug',
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

// Quote schemas
export const CreateQuoteSchema = z.object({
  userName: z.string().optional().describe('Optional display name for the user'),
  reference: z.string().min(1).optional().describe('Full Bible reference string (e.g., "Genesis 1:1-5"). Either this OR the individual fields (startBook, startChapter, startVerse) must be provided, but not both.'),
  startBook: z.string().min(1).optional().describe('Starting book slug. Required if reference is not provided.'),
  endBook: z.string().optional().describe('Ending book slug (optional if same as startBook)'),
  startChapter: z.number().int().positive().optional().describe('Starting chapter number. Required if reference is not provided.'),
  endChapter: z.number().int().positive().optional().describe('Ending chapter number (optional if same as startChapter)'),
  startVerse: z.number().int().positive().optional().describe('Starting verse number. Required if reference is not provided.'),
  endVerse: z.number().int().positive().optional().describe('Ending verse number (optional if single verse)'),
  userLanguage: z.string().min(2).max(10).optional().describe('Optional ISO language code (e.g., "ro", "en"). Defaults to "en" if not provided.'),
  userNote: z.string().optional().describe('Optional user note or comment about this quote'),
}).superRefine((data, ctx) => {
  // Check if both reference and individual fields are provided
  const hasReference = data.reference !== undefined && data.reference !== '';
  const hasIndividualFields = data.startBook !== undefined || data.startChapter !== undefined || data.startVerse !== undefined;

  if (hasReference && hasIndividualFields) {
    ctx.addIssue({
      code: 'custom',
      message: 'Cannot provide both reference and individual fields (startBook, startChapter, startVerse). Use one or the other.',
      path: ['reference'],
    });
    return;
  }

  if (!hasReference && !hasIndividualFields) {
    ctx.addIssue({
      code: 'custom',
      message: 'Must provide either reference or individual fields (startBook, startChapter, startVerse).',
      path: ['reference'],
    });
    return;
  }

  // If individual fields are provided, validate that required fields are present
  if (!hasReference) {
    if (data.startBook === undefined || data.startBook === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'startBook is required when reference is not provided',
        path: ['startBook'],
      });
    }
    if (data.startChapter === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'startChapter is required when reference is not provided',
        path: ['startChapter'],
      });
    }
    if (data.startVerse === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'startVerse is required when reference is not provided',
        path: ['startVerse'],
      });
    }
  }
});

export const QuoteSchema = z.object({
  id: z.number().describe('Unique quote ID'),
  userName: z.string().nullable().describe('User display name'),
  reference: z.string().describe('Full Bible reference string'),
  userLanguage: z.string().describe('ISO language code'),
  userNote: z.string().nullable().describe('Optional user note about this quote'),
  verses: z.array(VerseSchema).describe('Bible verses for this quote in the requested translation'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  publishedAt: z.string().nullable().describe('Publication timestamp'),
});

export const CreateQuoteResponseSchema = SuccessSchema.extend({
  quote: z.object({
    id: z.number().describe('Created quote ID'),
  }).describe('Created quote information'),
});

export const PublishedQuotesResponseSchema = SuccessSchema.extend({
  count: z.number().describe('Number of published quotes returned'),
  quotes: z.array(QuoteSchema).describe('List of published quotes'),
});

export const GetQuotesQuerySchema = z.object({
  bibleTranslationSlug: z.string().min(1).describe('Translation slug to filter quotes by (e.g., "vdcc")').openapi({
    example: 'vdcc',
  }),
  startBook: z.string().optional().describe('Filter quotes starting from this book (optional)').openapi({
    example: 'genesis',
  }),
  endBook: z.string().optional().describe('Filter quotes ending at this book (optional)').openapi({
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
});

// Daily Verse schemas
export const DailyVerseSchema = z.object({
  date: z.string().describe('Date for this daily verse (YYYY-MM-DD)'),
  reference: z.string().describe('Full Bible reference string'),
  verses: z.array(VerseSchema).describe('Bible verses for this daily verse in the requested translation'),
});

export const DailyVerseResponseSchema = SuccessSchema.extend({
  dailyVerse: DailyVerseSchema.describe('Daily verse details'),
});

export const DailyVersesResponseSchema = SuccessSchema.extend({
  count: z.number().describe('Number of daily verses returned'),
  dailyVerses: z.array(DailyVerseSchema).describe('List of daily verses'),
});

// Note: Daily verse query schemas are now dynamically generated in utils/dynamic-schema.ts
// to include translation slugs from translations.json
