import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  DailyVerseResponseSchema,
  DailyVersesResponseSchema,
  ErrorSchema,
} from '@/schemas/index';
import { getDailyVerse, getDailyVersesBetweenDates } from '@/services/daily-verses.service';
import { createDynamicGetDailyVerseQuerySchema, createDynamicGetDailyVersesQuerySchema } from '@/utils/dynamic-schema';

const app = new OpenAPIHono();

// Create dynamic query schemas with translation slugs from translations.json
const GetDailyVerseQuerySchema = createDynamicGetDailyVerseQuerySchema();
const GetDailyVersesQuerySchema = createDynamicGetDailyVersesQuerySchema();

// GET /api/v1/bible/daily-verse - Get the daily verse
const getDailyVerseRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getDailyVerse',
  tags: ['Daily Bible Verses'],
  summary: 'Get daily verse',
  description: `Retrieve the daily verse for a specific date with its text in the requested translation.

**Required Parameters:**
- bibleTranslationSlug: Translation identifier (e.g., "vdcc")

**Optional Parameters:**
- date: Date for the daily verse (YYYY-MM-DD). Defaults to today if not provided.

**Returns:**
- Date of the daily verse
- Full Bible reference string (e.g., "Genesis 1:1-5")
- Array of verses with their text in the requested translation

**Examples:**
\`GET /api/v1/bible/daily-verse?bibleTranslationSlug=vdcc\` - Get today's daily verse in VDCC translation
\`GET /api/v1/bible/daily-verse?bibleTranslationSlug=vdcc&date=2025-12-25\` - Get Christmas day verse in VDCC
\`GET /api/v1/bible/daily-verse?bibleTranslationSlug=kjv&date=2025-12-25\` - Christmas day verse in KJV`,
  request: {
    query: GetDailyVerseQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: DailyVerseResponseSchema,
          example: {
            success: true,
            dailyVerse: {
              date: '2025-12-25',
              reference: 'John 3:16',
              verses: [
                {
                  bookSlug: 'john',
                  bookName: 'Ioan',
                  chapter: 3,
                  verse: 16,
                  text: 'Fiindcă atât de mult a iubit Dumnezeu lumea, că a dat pe singurul Lui Fiu, pentru ca oricine crede în El, să nu piară, ci să aibă viaţa veşnică.',
                },
              ],
            },
          },
        },
      },
      description: 'Daily verse retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'No daily verse found for the specified date',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Invalid query parameters',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Server error',
    },
  },
});

app.openapi(getDailyVerseRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const date = query.date;
    const bibleTranslationSlug = query.bibleTranslationSlug;

    const result = await getDailyVerse(date, bibleTranslationSlug);

    if (result === null) {
      return c.json({
        success: false,
        error: `No daily verse found for date: ${date ?? 'today'}`,
      }, 404);
    }

    return c.json({
      success: true,
      dailyVerse: result,
    }, 200);
  } catch (error) {
    console.error('Error fetching daily verse:', error);
    return c.json({ success: false, error: 'Failed to fetch daily verse' }, 500);
  }
});

// GET /api/v1/bible/daily-verses - Get daily verses (single or range)
const getDailyVersesRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getDailyVerses',
  tags: ['Daily Bible Verses'],
  summary: 'Get daily verses',
  description: `Retrieve daily verses for a date range with their text in the requested translation.

**Required Parameters:**
- bibleTranslationSlug: Translation identifier (e.g., "vdcc")
- startDate: Start date for range query (YYYY-MM-DD)
- endDate: End date for range query (YYYY-MM-DD)

**Returns:**
- Array of daily verses, each containing:
  - Date of the daily verse
  - Full Bible reference string
  - Array of verses with their text in the requested translation

**Examples:**
\`GET /api/v1/bible/daily-verses?bibleTranslationSlug=vdcc&startDate=2025-12-01&endDate=2025-12-31\` - Get all December 2025 verses in VDCC
\`GET /api/v1/bible/daily-verses?bibleTranslationSlug=kjv&startDate=2025-01-01&endDate=2025-01-07\` - Get first week of January 2025 in KJV`,
  request: {
    query: GetDailyVersesQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: DailyVersesResponseSchema,
          example: {
            success: true,
            count: 2,
            dailyVerses: [
              {
                date: '2025-12-24',
                reference: 'Isaiah 9:6',
                verses: [
                  {
                    bookSlug: 'isaiah',
                    bookName: 'Isaia',
                    chapter: 9,
                    verse: 6,
                    text: 'Căci un copil ni s-a născut, un fiu ni s-a dat, şi domnia va fi pe umărul Lui; Îl vor numi: Minunat, Sfetnic, Dumnezeu tare, Părintele veşniciilor, Domn al păcii.',
                  },
                ],
              },
              {
                date: '2025-12-25',
                reference: 'John 3:16',
                verses: [
                  {
                    bookSlug: 'john',
                    bookName: 'Ioan',
                    chapter: 3,
                    verse: 16,
                    text: 'Fiindcă atât de mult a iubit Dumnezeu lumea, că a dat pe singurul Lui Fiu, pentru ca oricine crede în El, să nu piară, ci să aibă viaţa veşnică.',
                  },
                ],
              },
            ],
          },
        },
      },
      description: 'Daily verses retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'No daily verse found for the specified date',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Invalid query parameters',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Server error',
    },
  },
});

app.openapi(getDailyVersesRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { startDate, endDate, bibleTranslationSlug } = query;

    // Both startDate and endDate are required
    if (startDate === undefined || endDate === undefined) {
      return c.json({
        success: false,
        error: 'Both startDate and endDate are required',
      }, 400);
    }

    // Validate that startDate is before or equal to endDate
    if (new Date(startDate) > new Date(endDate)) {
      return c.json({
        success: false,
        error: 'startDate must be before or equal to endDate',
      }, 400);
    }

    const results = await getDailyVersesBetweenDates(startDate, endDate, bibleTranslationSlug);

    return c.json({
      success: true,
      count: results.length,
      dailyVerses: results,
    }, 200);
  } catch (error) {
    console.error('Error fetching daily verses:', error);
    return c.json({ success: false, error: 'Failed to fetch daily verses' }, 500);
  }
});

export { app as dailyVersesRoute };
