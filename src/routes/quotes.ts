import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  CreateQuoteSchema,
  CreateQuoteResponseSchema,
  PublishedQuotesResponseSchema,
  ErrorSchema,
} from '@/schemas/index';
import { upsertQuote, getPublishedQuotes } from '@/services/quotes.service';
import { parseReference } from '@/utils/reference-parser';

const app = new OpenAPIHono();

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

**Note:** You must provide EITHER reference OR individual fields (startBook, startChapter, startVerse), not both. All fields except the reference/individual fields are optional.`,
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

    // If reference is provided, parse it
    if (body.reference !== undefined && body.reference !== '') {
      const translationSlug = body.translationSlug ?? 'vdcc';
      const parsed = await parseReference(body.reference, translationSlug);

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
  description: `Retrieve all published Bible quotes. Only public information is returned (no IP addresses).

**Returns:**
- Quote ID
- User name (if provided)
- Bible reference
- User language
- User note
- Timestamps (created, updated, published)

**Example:**
\`GET /api/v1/bible/quotes\``,
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
                reference: 'Genesis 1:1-5',
                userLanguage: 'en',
                userNote: 'In the beginning...',
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
    const results = await getPublishedQuotes();

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
