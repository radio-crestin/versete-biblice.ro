import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  CreateQuoteSchema,
  CreateQuoteResponseSchema,
  PublishedQuotesResponseSchema,
  ErrorSchema,
} from '@/schemas/index';
import { upsertQuote, getPublishedQuotes } from '@/services/quotes.service';
import { parseReference } from '@/utils/reference-parser';
import { createDynamicGetQuotesQuerySchema } from '@/utils/dynamic-schema';

const app = new OpenAPIHono();

// Create dynamic query schema with translation slugs and book slugs
const GetQuotesQuerySchema = createDynamicGetQuotesQuerySchema();

// POST /api/v1/bible/quotes - Create a new Bible quote
const createQuoteRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createQuote',
  tags: ['Bible Quotes'],
  summary: 'Create a Bible quote',
  description: `Create a new Bible quote using either a reference string OR individual fields. The client IP address is automatically captured.

**Using reference string (recommended):**
\`\`\`json
{
  "reference": "Genesis 1:1-5",
  "userName": "John Doe",
  "userLanguage": "en",
  "userNote": "In the beginning..."
}
\`\`\`

**Using individual fields:**
\`\`\`json
{
  "startBook": "genesis",
  "startChapter": 1,
  "startVerse": 1,
  "endVerse": 5,
  "userName": "John Doe",
  "userLanguage": "en",
  "userNote": "In the beginning..."
}
\`\`\`

**Note:**
- Quotes are translation-agnostic and only store the reference information
- You must provide EITHER reference OR individual fields (startBook, startChapter, startVerse), not both
- All fields are optional except the reference/individual fields`,
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateQuoteSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: CreateQuoteResponseSchema,
          example: {
            success: true,
            quote: {
              id: 1,
            },
          },
        },
      },
      description: 'Quote created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Invalid request body',
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

app.openapi(createQuoteRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    // Capture client IP address
    const cfIp = c.req.header('cf-connecting-ip');
    const forwardedFor = c.req.header('x-forwarded-for');
    const realIp = c.req.header('x-real-ip');
    const clientIp = cfIp ?? (forwardedFor?.split(',')[0].trim() ?? (realIp ?? 'unknown'));

    let reference: string;
    let startBook: string;
    let endBook: string | null = null;
    let startChapter: number;
    let endChapter: number | null = null;
    let startVerse: number;
    let endVerse: number | null = null;

    // If reference is provided, parse it (using default translation for parsing)
    if (body.reference !== undefined && body.reference !== '') {
      const parsed = await parseReference(body.reference, 'vdcc');

      if (parsed === null) {
        return c.json({
          success: false,
          error: 'Invalid reference format. Please use format like "Genesis 1:1" or "Genesis 1:1-5"'
        }, 400);
      }

      reference = body.reference;
      startBook = parsed.book;
      startChapter = parsed.chapter;
      startVerse = parsed.verse;
      endBook = parsed.endBook ?? null;
      endChapter = parsed.endChapter ?? null;
      endVerse = parsed.endVerse ?? null;
    } else {
      // Use individual fields - body.startBook, startChapter, startVerse are guaranteed to exist by schema validation
      const reqStartBook = body.startBook ?? '';
      const reqStartChapter = body.startChapter ?? 0;
      const reqStartVerse = body.startVerse ?? 0;

      reference = `${reqStartBook} ${String(reqStartChapter)}:${String(reqStartVerse)}`;
      if (body.endBook !== undefined || body.endChapter !== undefined || body.endVerse !== undefined) {
        if (body.endBook !== undefined && body.endBook !== reqStartBook) {
          reference += `-${body.endBook} ${String(body.endChapter ?? reqStartChapter)}:${String(body.endVerse ?? reqStartVerse)}`;
        } else if (body.endChapter !== undefined && body.endChapter !== reqStartChapter) {
          reference += `-${String(body.endChapter)}:${String(body.endVerse ?? reqStartVerse)}`;
        } else if (body.endVerse !== undefined) {
          reference += `-${String(body.endVerse)}`;
        }
      }

      startBook = reqStartBook;
      startChapter = reqStartChapter;
      startVerse = reqStartVerse;
      endBook = body.endBook ?? null;
      endChapter = body.endChapter ?? null;
      endVerse = body.endVerse ?? null;
    }

    // Validate start and end values
    if (endBook !== null && endBook !== startBook) {
      // Cross-book reference - no specific validation needed for now
    } else if (endChapter !== null && endChapter < startChapter) {
      return c.json({
        success: false,
        error: 'End chapter must be greater than or equal to start chapter'
      }, 400);
    } else if (endChapter !== null && endChapter === startChapter && endVerse !== null && endVerse < startVerse) {
      return c.json({
        success: false,
        error: 'End verse must be greater than or equal to start verse within the same chapter'
      }, 400);
    } else if (endChapter === null && endVerse !== null && endVerse < startVerse) {
      return c.json({
        success: false,
        error: 'End verse must be greater than or equal to start verse'
      }, 400);
    }

    // Create quote with all fields
    const result = await upsertQuote({
      clientIp,
      userName: body.userName ?? null,
      reference,
      startBook,
      endBook,
      startChapter,
      endChapter,
      startVerse,
      endVerse,
      userLanguage: body.userLanguage ?? 'en',
      userNote: body.userNote ?? null,
      published: true,
      publishedAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      quote: {
        id: result.id,
      },
    }, 201);
  } catch (error) {
    console.error('Error creating quote:', error);
    return c.json({ success: false, error: 'Failed to create quote' }, 500);
  }
});

// GET /api/v1/bible/quotes - Get all published quotes
const getPublishedQuotesRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getPublishedQuotes',
  tags: ['Bible Quotes'],
  summary: 'Get published quotes',
  description: `Retrieve published Bible quotes with their verses, filtered by translation and optionally by book, chapter, verse range, publication date, and pagination.

**Required Parameters:**
- bibleTranslationSlug: Translation identifier (e.g., "vdcc") - verses will be returned in this translation

**Optional Filters:**
- startBook, endBook: Filter quotes by book range (English slugs like "genesis", "exodus")
- startChapter, endChapter: Filter quotes by chapter range
- startVerse, endVerse: Filter quotes by verse range
- publishedAtGt: Filter quotes published after this date (ISO 8601 format)
- publishedAtGte: Filter quotes published on or after this date (ISO 8601 format)
- publishedAtLt: Filter quotes published before this date (ISO 8601 format)
- publishedAtLte: Filter quotes published on or before this date (ISO 8601 format)

**Pagination:**
- limit: Maximum number of quotes to return (default: 50, max: 500)
- offset: Number of quotes to skip (default: 0)

**Returns (for each quote):**
- Quote metadata (ID, user name, reference, language, note, timestamps)
- Full array of verses with their text (from the specified translation)

**Examples:**
\`GET /api/v1/bible/quotes?bibleTranslationSlug=vdcc\` - Get first 50 quotes for VDCC translation
\`GET /api/v1/bible/quotes?bibleTranslationSlug=vdcc&limit=100&offset=50\` - Get quotes 51-150
\`GET /api/v1/bible/quotes?bibleTranslationSlug=vdcc&startBook=genesis&endBook=exodus\` - Filter by book range
\`GET /api/v1/bible/quotes?bibleTranslationSlug=vdcc&publishedAtGte=2025-01-01T00:00:00Z\` - Quotes published in 2025+`,
  request: {
    query: GetQuotesQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PublishedQuotesResponseSchema,
          example: {
            success: true,
            count: 2,
            quotes: [
              {
                id: 1,
                userName: 'John Doe',
                reference: 'Genesis 1:1-2',
                userLanguage: 'en',
                userNote: 'In the beginning...',
                verses: [
                  {
                    bookSlug: 'genesis',
                    bookName: 'Geneza',
                    chapter: 1,
                    verse: 1,
                    text: 'La început Dumnezeu a făcut cerurile şi pământul.',
                  },
                  {
                    bookSlug: 'genesis',
                    bookName: 'Geneza',
                    chapter: 1,
                    verse: 2,
                    text: 'Pământul era pustiu şi gol...',
                  },
                ],
                createdAt: '2025-10-27 12:00:00',
                updatedAt: '2025-10-27 12:00:00',
                publishedAt: '2025-10-27 12:00:00',
              },
              {
                id: 2,
                userName: null,
                reference: 'John 3:16',
                userLanguage: 'en',
                userNote: 'For God so loved the world...',
                verses: [
                  {
                    bookSlug: 'john',
                    bookName: 'Ioan',
                    chapter: 3,
                    verse: 16,
                    text: 'Fiindcă atât de mult a iubit Dumnezeu lumea...',
                  },
                ],
                createdAt: '2025-10-27 11:30:00',
                updatedAt: '2025-10-27 11:30:00',
                publishedAt: '2025-10-27 11:30:00',
              },
            ],
          },
        },
      },
      description: 'Published quotes retrieved successfully',
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

app.openapi(getPublishedQuotesRoute, async (c) => {
  try {
    const query = c.req.valid('query');

    const results = await getPublishedQuotes(query.bibleTranslationSlug, {
      startBook: query.startBook,
      endBook: query.endBook,
      startChapter: query.startChapter,
      endChapter: query.endChapter,
      startVerse: query.startVerse,
      endVerse: query.endVerse,
      limit: query.limit,
      offset: query.offset,
      publishedAtGt: query.publishedAtGt,
      publishedAtGte: query.publishedAtGte,
      publishedAtLt: query.publishedAtLt,
      publishedAtLte: query.publishedAtLte,
    });

    return c.json({
      success: true,
      count: results.length,
      quotes: results,
    }, 200);
  } catch (error) {
    console.error('Error fetching published quotes:', error);
    return c.json({ success: false, error: 'Failed to fetch published quotes' }, 500);
  }
});

export { app as quotesRoute };
