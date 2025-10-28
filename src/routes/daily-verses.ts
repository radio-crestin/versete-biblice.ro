import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  DailyVersesResponseSchema,
  ErrorSchema,
} from '@/schemas/index';
import { getDailyVersesBetweenDates } from '@/services/daily-verses.service';
import { createDynamicGetDailyVersesQuerySchema } from '@/utils/dynamic-schema';

const app = new OpenAPIHono();

// Create dynamic query schema with translation slugs from translations.json
const GetDailyVersesQuerySchema = createDynamicGetDailyVersesQuerySchema();

// GET /api/v1/bible/daily-verses - Get daily verses (range)
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
