import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db, translations } from '../db/index.js';
import { eq } from 'drizzle-orm';
import {
  TranslationsResponseSchema,
  ErrorSchema,
} from '../schemas/index.js';
import { createDynamicTranslationsQuerySchema } from '../utils/dynamic-schema.js';

const app = new OpenAPIHono();

// GET /api/v1/bible/translations - Get translations with optional language filter
// Create dynamic schema at route registration time (after initialization)
const getAllTranslationsRoute = createRoute({
  method: 'get',
  path: '/',
  operationId: 'getTranslations',
  tags: ['Bible API'],
  summary: 'Get Bible translations',
  description: `Retrieve a list of all available Bible translations. Optionally filter by language code.

**Examples:**
- Get All Bible translations: \`/api/v1/bible/translations\`
- Get Romanian translations: \`/api/v1/bible/translations?language=ro\`
- Get English translations: \`/api/v1/bible/translations?language=en\``,
  request: {
    query: createDynamicTranslationsQuerySchema(),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: TranslationsResponseSchema,
          example: {
            success: true,
            count: 1,
            translations: [
              {
                id: 1,
                slug: 'vdcc',
                language: 'ron',
                abbreviation: 'rccv',
                name: 'RON RCCV',
                totalBooks: 66,
                totalChapters: 1189,
                totalVerses: 31102,
                copyrightNotice: null,
                books: [
                  {
                    bookIndex: 1,
                    slug: 'genesis',
                    name: 'Geneza',
                    maxChapter: 50,
                    versesByChapter: {
                      1: 31,
                      2: 25,
                      3: 24,
                    },
                  },
                ],
                createdAt: '2025-10-27 10:42:44',
                updatedAt: '2025-10-27T10:42:55.720Z',
              },
            ],
          },
        },
      },
      description: 'List of translations retrieved successfully',
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

app.openapi(getAllTranslationsRoute, async (c) => {
    const { language } = c.req.valid('query');

    try {
      let results;

      if (language !== undefined) {
        // Filter by language
        results = await db
          .select()
          .from(translations)
          .where(eq(translations.language, language));
      } else {
        // Get translations
        results = await db.select().from(translations);
      }

      // Drizzle handles JSON parsing automatically with mode: 'json'
      return c.json({
        success: true,
        count: results.length,
        translations: results,
      }, 200);
    } catch (error) {
      console.error('Error fetching translations:', error);
      return c.json({ success: false, error: 'Failed to fetch translations' }, 500);
    }
  }
);

export { app as translationsRoute };
