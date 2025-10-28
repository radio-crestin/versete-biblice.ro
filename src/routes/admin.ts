import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db, translations } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateBooksDataJSON } from '@/services/books-generator.js';
import { ErrorSchema, SuccessSchema } from '@/schemas/index.js';
import type { Context } from 'hono';

const app = new OpenAPIHono();

/**
 * Validate system token from context
 */
function validateToken(c: Context): { valid: boolean; error?: string } {
  const systemToken = c.env?.SYSTEM_TOKEN as string | undefined;

  if (systemToken === undefined || systemToken === '') {
    return { valid: false, error: 'System token not configured' };
  }

  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token === undefined || token === '' || token !== systemToken) {
    return { valid: false, error: 'Unauthorized' };
  }

  return { valid: true };
}

// POST /api/v1/internal/generate-books/:slug - Generate books data for a translation
const generateBooksRoute = createRoute({
  method: 'post',
  path: '/generate-books/{slug}',
  operationId: 'generateBooks',
  tags: ['Admin API'],
  summary: 'Generate books data for a translation',
  description: 'Internal endpoint to generate and store books data for a translation. Requires system token authentication.',
  security: [
    {
      bearerAuth: [],
    },
  ],
  request: {
    params: z.object({
      slug: z.string().min(1).describe('Translation slug'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessSchema.extend({
            message: z.string(),
            booksCount: z.number(),
          }),
        },
      },
      description: 'Books data generated successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing system token',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Translation not found',
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

app.openapi(generateBooksRoute, async (c) => {
  // Validate token
  const tokenValidation = validateToken(c);
  if (!tokenValidation.valid) {
    const statusCode = tokenValidation.error === 'System token not configured' ? 500 : 401;
    return c.json({ success: false, error: tokenValidation.error ?? 'Unauthorized' }, statusCode);
  }

  const validatedParams = c.req.valid('param');
  const slug = validatedParams.slug;

  try {
    // Check if translation exists
    const translation = await db
      .select()
      .from(translations)
      .where(eq(translations.slug, slug))
      .limit(1);

    if (translation.length === 0) {
      return c.json({ success: false, error: 'Translation not found' }, 404);
    }

    // Generate books data
    const booksJSON = await generateBooksDataJSON(slug);
    const books = JSON.parse(booksJSON);

    // Update translation with books data
    await db
      .update(translations)
      .set({
        books: booksJSON,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(translations.slug, slug));

    return c.json(
      {
        success: true,
        message: `Books data generated for translation: ${slug}`,
        booksCount: books.length,
      },
      200
    );
  } catch (error) {
    console.error('Error generating books data:', error);
    return c.json({ success: false, error: 'Failed to generate books data' }, 500);
  }
});

// POST /api/v1/internal/generate-all-books - Generate books data for all translations
const generateAllBooksRoute = createRoute({
  method: 'post',
  path: '/generate-all-books',
  operationId: 'generateAllBooks',
  tags: ['Admin API'],
  summary: 'Generate books data for all translations',
  description: 'Internal endpoint to generate and store books data for all translations. Requires system token authentication.',
  security: [
    {
      bearerAuth: [],
    },
  ],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessSchema.extend({
            message: z.string(),
            translationsProcessed: z.number(),
          }),
        },
      },
      description: 'Books data generated for all translations successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing system token',
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

app.openapi(generateAllBooksRoute, async (c) => {
  // Validate token
  const tokenValidation = validateToken(c);
  if (!tokenValidation.valid) {
    const statusCode = tokenValidation.error === 'System token not configured' ? 500 : 401;
    return c.json({ success: false, error: tokenValidation.error ?? 'Unauthorized' }, statusCode);
  }

  try {
    // Get all translations
    const allTranslations = await db.select().from(translations);

    let processed = 0;
    for (const translation of allTranslations) {
      try {
        const booksJSON = await generateBooksDataJSON(translation.slug);

        await db
          .update(translations)
          .set({
            books: booksJSON,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(translations.slug, translation.slug));

        processed++;
        console.info(`✅ Generated books data for: ${translation.slug}`);
      } catch (error) {
        console.error(`❌ Failed to generate books data for ${translation.slug}:`, error);
      }
    }

    return c.json(
      {
        success: true,
        message: `Books data generated for ${processed} translations`,
        translationsProcessed: processed,
      },
      200
    );
  } catch (error) {
    console.error('Error generating books data for all translations:', error);
    return c.json({ success: false, error: 'Failed to generate books data' }, 500);
  }
});

export { app as adminRoute };
