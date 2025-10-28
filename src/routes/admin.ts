import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db, translations } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateBooksData } from '@/services/books-generator.js';
import { ErrorSchema, SuccessSchema } from '@/schemas/index.js';
import { getTranslationSlugs } from '@/utils/dynamic-schema.js';
import type { Context } from 'hono';

const app = new OpenAPIHono();

/**
 * Create dynamic admin param schema with actual translation slugs
 */
function createAdminParamSchema() {
  const translationSlugs = getTranslationSlugs();

  return z.object({
    bibleTranslationSlug: z.enum(translationSlugs as [string, ...string[]]).describe('Translation slug').openapi({
      param: {
        name: 'bibleTranslationSlug',
        in: 'path',
      },
      example: translationSlugs[0] ?? 'vdcc',
    }),
  });
}

/**
 * Validate system token from query parameter
 */
function validateToken(c: Context, providedToken: string | undefined): { valid: boolean; error?: string } {
  const systemToken = c.env?.SYSTEM_TOKEN as string | undefined;

  if (systemToken === undefined || systemToken === '') {
    return { valid: false, error: 'System token not configured' };
  }

  if (providedToken === undefined || providedToken === '' || providedToken !== systemToken) {
    return { valid: false, error: 'Unauthorized' };
  }

  return { valid: true };
}

// POST /api/v1/admin/generate-books/:bibleTranslationSlug - Generate books data for a translation
const generateBooksRoute = createRoute({
  method: 'post',
  path: '/generate-books/{bibleTranslationSlug}',
  operationId: 'generateBooks',
  tags: ['Admin API'],
  summary: 'Generate books data for a translation',
  description: 'Admin endpoint to generate and store books data for a translation. Requires system token as query parameter.',
  request: {
    params: createAdminParamSchema(),
    query: z.object({
      systemToken: z.string().min(1).describe('System authentication token').openapi({
        example: 'your-system-token-here',
      }),
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
      description: 'Unauthorized - Invalid or missing systemToken query parameter',
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
  const validatedParams = c.req.valid('param');
  const validatedQuery = c.req.valid('query');
  const bibleTranslationSlug = validatedParams.bibleTranslationSlug;
  const systemToken = validatedQuery.systemToken;

  // Validate token
  const tokenValidation = validateToken(c, systemToken);
  if (!tokenValidation.valid) {
    const statusCode = tokenValidation.error === 'System token not configured' ? 500 : 401;
    return c.json({ success: false, error: tokenValidation.error ?? 'Unauthorized' }, statusCode);
  }

  try {
    // Check if translation exists
    const translation = await db
      .select()
      .from(translations)
      .where(eq(translations.slug, bibleTranslationSlug))
      .limit(1);

    if (translation.length === 0) {
      return c.json({ success: false, error: 'Translation not found' }, 404);
    }

    // Generate books data
    const books = await generateBooksData(bibleTranslationSlug);

    // Update translation with books data (Drizzle handles JSON serialization)
    await db
      .update(translations)
      .set({
        books,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(translations.slug, bibleTranslationSlug));

    return c.json(
      {
        success: true,
        message: `Books data generated for translation: ${bibleTranslationSlug}`,
        booksCount: books.length,
      },
      200
    );
  } catch (error) {
    console.error('Error generating books data:', error);
    return c.json({ success: false, error: 'Failed to generate books data' }, 500);
  }
});

// POST /api/v1/admin/generate-all-books - Generate books data for all translations
const generateAllBooksRoute = createRoute({
  method: 'post',
  path: '/generate-all-books',
  operationId: 'generateAllBooks',
  tags: ['Admin API'],
  summary: 'Generate books data for all translations',
  description: 'Admin endpoint to generate and store books data for all translations. Requires system token as query parameter.',
  request: {
    query: z.object({
      systemToken: z.string().min(1).describe('System authentication token').openapi({
        example: 'your-system-token-here',
      }),
    }),
  },
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
      description: 'Unauthorized - Invalid or missing systemToken query parameter',
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
  const validatedQuery = c.req.valid('query');
  const systemToken = validatedQuery.systemToken;

  // Validate token
  const tokenValidation = validateToken(c, systemToken);
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
        const books = await generateBooksData(translation.slug);

        await db
          .update(translations)
          .set({
            books,
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
