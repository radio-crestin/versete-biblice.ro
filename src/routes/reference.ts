import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db, verses } from '../db/index.js';
import { eq, and, or, gte, lte } from 'drizzle-orm';
import { PassageResponseSchema, ErrorSchema } from '../schemas/index.js';
import { createDynamicPassageParamSchema } from '../utils/dynamic-schema.js';
import { parseReference } from '../utils/reference-parser.js';

const app = new OpenAPIHono();

// Create dynamic param schema
const ReferenceParamSchema = createDynamicPassageParamSchema();

// Query schema for reference string
const ReferenceQuerySchema = z.object({
  reference: z.string().min(1).describe('Bible reference string (e.g., "genesis 1:1", "genesis 1:1-5", "genesis 1:1 - 2:5", "genesis 1:1 to exodus 2:3")').openapi({
    example: 'genesis 1:1',
  }),
});

const getReferenceRoute = createRoute({
  method: 'get',
  path: '/{bibleTranslationSlug}/reference',
  operationId: 'getReference',
  tags: ['Bible API'],
  summary: 'Get a Bible passage by reference string',
  description: `Parse and retrieve Bible passages using natural reference strings.

Supports multiple formats:
- Single verse: "genesis 1:1"
- Verse range (same chapter): "genesis 1:1-5"
- Chapter range: "genesis 1:1 - 2:5"
- Cross-book range: "genesis 1:1-exodus 2:3"
- Alternative separators: "genesis 1:1 to 5", "genesis 1:1 -> 2:4"

Books can be specified using English slugs (genesis, matthew, 1-samuel) or localized names. Results are limited to 500 verses maximum.`,
  request: {
    params: ReferenceParamSchema,
    query: ReferenceQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PassageResponseSchema,
          example: {
            success: true,
            bibleTranslationSlug: 'vdcc',
            translationId: 1,
            start: {
              book: 'genesis',
              chapter: 1,
              verse: 1,
            },
            end: {
              book: 'genesis',
              chapter: 1,
              verse: 3,
            },
            verses: [
              {
                bookSlug: 'genesis',
                bookName: 'Geneza',
                chapter: 1,
                verse: 1,
                text: 'La început, Dumnezeu a făcut cerurile şi pământul.',
              },
              {
                bookSlug: 'genesis',
                bookName: 'Geneza',
                chapter: 1,
                verse: 2,
                text: 'Pământul era pustiu şi gol; peste faţa adâncului de ape era întuneric...',
              },
              {
                bookSlug: 'genesis',
                bookName: 'Geneza',
                chapter: 1,
                verse: 3,
                text: 'Dumnezeu a zis: „Să fie lumină!" Şi a fost lumină.',
              },
            ],
            count: 3,
          },
        },
      },
      description: 'Passage retrieved successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Invalid reference format',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Passage not found',
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

app.openapi(getReferenceRoute, async (c) => {
  const { bibleTranslationSlug } = c.req.valid('param');
  const { reference } = c.req.valid('query');

  try {
    // Parse the reference string
    const parsed = await parseReference(reference, bibleTranslationSlug);

    if (parsed === null) {
      return c.json(
        {
          success: false,
          error: `Invalid reference format: "${reference}". Expected format like "genesis 1:1" or "genesis 1:1-5" or "genesis 1:1 - 2:5"`,
        },
        400
      );
    }

    // Extract parsed values
    const { book, chapter, verse, endBook, endChapter, endVerse } = parsed;
    const startBook = book.toLowerCase();
    const finalEndBook = (endBook !== undefined && endBook.toLowerCase() !== '') ? endBook.toLowerCase() : startBook;
    const finalEndChapter = (endChapter !== undefined && endChapter !== 0) ? endChapter : chapter;
    const finalEndVerse = (endVerse !== undefined && endVerse !== 0) ? endVerse : verse;

    // Helper function to create book filter
    // The bookValue here is already a resolved book slug from parseReference
    const createBookFilter = (bookValue: string): ReturnType<typeof eq> => {
      return eq(verses.bookSlug, bookValue);
    };

    // Build the query based on the range (same logic as passage endpoint)
    let passageVerses;

    if (startBook === finalEndBook && chapter === finalEndChapter && verse === finalEndVerse) {
      // Single verse
      passageVerses = await db
        .select()
        .from(verses)
        .where(
          and(
            eq(verses.bibleTranslationSlug, bibleTranslationSlug),
            createBookFilter(startBook),
            eq(verses.chapter, chapter),
            eq(verses.verse, verse)
          )
        )
        .limit(1);
    } else if (startBook === finalEndBook && chapter === finalEndChapter) {
      // Verse range within same chapter
      passageVerses = await db
        .select()
        .from(verses)
        .where(
          and(
            eq(verses.bibleTranslationSlug, bibleTranslationSlug),
            createBookFilter(startBook),
            eq(verses.chapter, chapter),
            gte(verses.verse, verse),
            lte(verses.verse, finalEndVerse)
          )
        )
        .orderBy(verses.verse);
    } else if (startBook === finalEndBook) {
      // Multiple chapters in same book
      passageVerses = await db
        .select()
        .from(verses)
        .where(
          and(
            eq(verses.bibleTranslationSlug, bibleTranslationSlug),
            createBookFilter(startBook),
            or(
              // Start chapter: from start verse onwards
              and(eq(verses.chapter, chapter), gte(verses.verse, verse)),
              // Middle chapters: all verses
              and(
                gte(verses.chapter, chapter + 1),
                lte(verses.chapter, finalEndChapter - 1)
              ),
              // End chapter: up to end verse
              and(eq(verses.chapter, finalEndChapter), lte(verses.verse, finalEndVerse))
            )
          )
        )
        .orderBy(verses.chapter, verses.verse)
        .limit(500); // Safety limit
    } else {
      // Cross-book range
      passageVerses = await db
        .select()
        .from(verses)
        .where(
          and(
            eq(verses.bibleTranslationSlug, bibleTranslationSlug),
            or(
              // Start book: from start chapter/verse onwards
              and(
                createBookFilter(startBook),
                or(
                  and(eq(verses.chapter, chapter), gte(verses.verse, verse)),
                  gte(verses.chapter, chapter + 1)
                )
              ),
              // End book: up to end chapter/verse
              and(
                createBookFilter(finalEndBook),
                or(
                  lte(verses.chapter, finalEndChapter - 1),
                  and(eq(verses.chapter, finalEndChapter), lte(verses.verse, finalEndVerse))
                )
              )
            )
          )
        )
        .orderBy(verses.chapter, verses.verse)
        .limit(500); // Safety limit for cross-book queries
    }

    if (passageVerses.length === 0) {
      return c.json(
        {
          success: false,
          error: `Passage not found for reference: "${reference}"`,
        },
        404
      );
    }

    const firstVerse = passageVerses[0];
    const lastVerse = passageVerses[passageVerses.length - 1];

    return c.json({
      success: true,
      bibleTranslationSlug,
      translationId: firstVerse.translationId,
      start: {
        book: startBook,
        chapter,
        verse,
      },
      end: {
        book: lastVerse.bookSlug,
        chapter: lastVerse.chapter,
        verse: lastVerse.verse,
      },
      verses: passageVerses.map(v => ({
        bookSlug: v.bookSlug,
        bookName: v.bookName,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
      })),
      count: passageVerses.length,
    }, 200);
  } catch (error) {
    console.error('Error fetching reference:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch passage',
      },
      500
    );
  }
});

export { app as referenceRoute };
