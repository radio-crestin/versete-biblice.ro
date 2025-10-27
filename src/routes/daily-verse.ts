import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  DailyVerseResponseSchema,
  ErrorSchema,
} from '@/schemas/index';
import { getDailyVerse } from '@/services/daily-verses.service';
import { createDynamicGetDailyVerseQuerySchema } from '@/utils/dynamic-schema';

const app = new OpenAPIHono();

// Create dynamic query schema with translation slugs from translations.json
const GetDailyVerseQuerySchema = createDynamicGetDailyVerseQuerySchema();

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

export { app as dailyVerseRoute };
