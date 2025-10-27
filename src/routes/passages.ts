import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db, verses } from '../db/index.js';
import { eq, and, or, gte, lte } from 'drizzle-orm';
import {
  PassageResponseSchema,
  ErrorSchema,
} from '../schemas/index.js';
import {
  createDynamicPassageParamSchema,
  createDynamicPassageQuerySchema
} from '../utils/dynamic-schema.js';

const app = new OpenAPIHono();

// Create dynamic route schemas
const PassageParamSchema = createDynamicPassageParamSchema();
const PassageQuerySchema = createDynamicPassageQuerySchema();

const getPassageRoute = createRoute({
  method: 'get',
  path: '/{bibleTranslationSlug}/passage',
  operationId: 'getPassage',
  tags: ['Bible API'],
  summary: 'Get a Bible passage',
  description: 'Retrieve verses from a specific translation. Supports single verse, verse ranges, chapter ranges, and cross-book ranges. Books can be specified using English slugs (genesis, matthew, 1-samuel) or localized names (geneza, matei). Results are limited to 500 verses maximum.',
  request: {
    params: PassageParamSchema,
    query: PassageQuerySchema,
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
              book: 'geneza',
              chapter: 1,
              verse: 1,
            },
            end: {
              book: 'geneza',
              chapter: 2,
              verse: 3,
            },
            verses: [
              {
                bookSlug: 'geneza',
                bookName: 'Geneza',
                chapter: 1,
                verse: 1,
                text: 'La început, Dumnezeu a făcut cerurile şi pământul.',
              },
              {
                bookSlug: 'geneza',
                bookName: 'Geneza',
                chapter: 1,
                verse: 2,
                text: 'Pământul era pustiu şi gol; peste faţa adâncului de ape era întuneric...',
              },
              {
                bookSlug: 'geneza',
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
      description: 'Invalid parameters',
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

app.openapi(getPassageRoute, async (c) => {
    const { bibleTranslationSlug } = c.req.valid('param');
    const { book, chapter, verse, endBook, endChapter, endVerse } = c.req.valid('query');

    const startBook = book.toLowerCase();
    const finalEndBook = (endBook ?? '').toLowerCase() !== '' ? (endBook ?? '').toLowerCase() : startBook;
    const finalEndChapter = endChapter ?? chapter;
    const finalEndVerse = endVerse ?? verse;

  try {
    // Helper function to create book filter
    // The bookValue here is already a resolved book slug from the caller
    const createBookFilter = (bookValue: string): ReturnType<typeof eq> => {
      return eq(verses.bookSlug, bookValue);
    };

    // Build the query based on the range
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
        { success: false, error: 'Passage not found' },
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
    console.error('Error fetching passage:', error);
    return c.json(
      { success: false, error: 'Failed to fetch passage' },
      500
    );
  }
});

export { app as passagesRoute };
