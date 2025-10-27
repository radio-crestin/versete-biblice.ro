import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  CreateQuoteSchema,
  CreateQuoteResponseSchema,
  PublishedQuotesResponseSchema,
  ErrorSchema,
} from '@/schemas/index';
import { upsertQuote, getPublishedQuotes } from '@/services/quotes.service';

const app = new OpenAPIHono();

// POST /api/v1/bible/quotes - Create a new Bible quote
const createQuoteRoute = createRoute({
  method: 'post',
  path: '/',
  operationId: 'createQuote',
  tags: ['Bible Quotes'],
  summary: 'Create a Bible quote',
  description: `Create a new Bible quote with a reference and user note. The client IP address is automatically captured.

**Example:**
\`\`\`json
{
  "userName": "John Doe",
  "reference": "Genesis 1:1-5",
  "startBook": "genesis",
  "startChapter": 1,
  "startVerse": 1,
  "endVerse": 5,
  "userLanguage": "en",
  "userNote": "In the beginning...",
  "published": true
}
\`\`\``,
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
    const clientIp = c.req.header('cf-connecting-ip') // Cloudflare
      || c.req.header('x-forwarded-for')?.split(',')[0].trim()
      || c.req.header('x-real-ip')
      || 'unknown';

    // Create quote with all fields
    const result = await upsertQuote({
      clientIp,
      userName: body.userName || null,
      reference: body.reference,
      startBook: body.startBook,
      endBook: body.endBook || null,
      startChapter: body.startChapter,
      endChapter: body.endChapter || null,
      startVerse: body.startVerse,
      endVerse: body.endVerse || null,
      userLanguage: body.userLanguage,
      userNote: body.userNote,
      published: body.published,
      publishedAt: body.published ? new Date().toISOString() : null,
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
