import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { Hono } from 'hono';
import { z } from 'zod';
import { db, verses } from '../db/index.js';
import { and, or, eq, gte, lte, sql } from 'drizzle-orm';
import { parseReference } from '../utils/reference-parser.js';
import translationsData from '../data/translations.json' with { type: 'json' };

const app = new Hono();

/**
 * Get all available translations from static JSON
 */
function getAllTranslations() {
  return translationsData.translations;
}

/**
 * Format translations for documentation
 */
function formatTranslationsForDocs(translationList: Array<{ slug: string; language: string; name: string }>) {
  return translationList
    .map(t => `  - ${t.slug}: [${t.language.toUpperCase()}] - ${t.name}`)
    .join('\n');
}

/**
 * Get a Bible passage using a natural reference string
 */
async function getBiblePassage(translationSlug: string, reference: string) {
  try {
    // Parse the reference string
    const parsed = await parseReference(reference, translationSlug);

    if (!parsed) {
      return {
        success: false,
        error: `Invalid reference format: "${reference}". Expected format like "genesis 1:1" or "genesis 1:1-5" or "genesis 1:1 - 2:5"`,
      };
    }

    // Extract parsed values
    const { book, chapter, verse, endBook, endChapter, endVerse } = parsed;
    const startBook = book.toLowerCase();
    const finalEndBook = endBook?.toLowerCase() || startBook;
    const finalEndChapter = endChapter || chapter;
    const finalEndVerse = endVerse || verse;

    // Helper function to create book filter that supports both slug and bookName
    const createBookFilter = (bookValue: string) => {
      return or(
        eq(verses.bookSlug, bookValue),
        sql`LOWER(${verses.bookName}) = ${bookValue.toLowerCase()}`
      );
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
            eq(verses.translationSlug, translationSlug),
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
            eq(verses.translationSlug, translationSlug),
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
            eq(verses.translationSlug, translationSlug),
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
            eq(verses.translationSlug, translationSlug),
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
      return {
        success: false,
        error: `Passage not found for reference: "${reference}"`,
      };
    }

    const firstVerse = passageVerses[0];
    const lastVerse = passageVerses[passageVerses.length - 1];

    return {
      success: true,
      translationSlug,
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
    };
  } catch (error) {
    console.error('Error fetching reference:', error);
    return {
      success: false,
      error: 'Failed to fetch passage',
    };
  }
}

// Initialize MCP server
const translationList = getAllTranslations();
const translationDocs = formatTranslationsForDocs(translationList);

const mcpServer = new McpServer({
  name: 'bible-mcp',
  version: '1.0.0',
});

// Register the get_bible_translations tool
mcpServer.registerTool(
  'get_bible_translations',
  {
    title: 'Get Available Bible Translations',
    description: `Get a list of all available Bible translations with their details.

Returns information about each translation including:
- slug: The translation identifier to use in get_bible_passage
- language: ISO 639-3 set 1language code (e.g., "ro" for Romanian, "en" for English)
- name: Full name of the translation

IMPORTANT: Call this tool first to get the available translation slugs before calling get_bible_passage.`,
    inputSchema: {},
  },
  async () => {
    const translations = getAllTranslations();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            translations,
            count: translations.length,
          }, null, 2),
        },
      ],
    };
  }
);

// Register the get_bible_passage tool
mcpServer.registerTool(
  'get_bible_passage',
  {
    title: 'Get Bible Passage',
    description: `Get a Bible passage using a natural reference string.

IMPORTANT: Before calling this tool, call get_bible_translations to get the list of available translation slugs.
Use the 'slug' value from get_bible_translations as the translationSlug parameter.

Reference format examples:
  - Single verse: "genesis 1:1"
  - Verse range (same chapter): "genesis 1:1-5"
  - Chapter range: "genesis 1:1 - 2:5"
  - Cross-book range: "genesis 1:1 to exodus 2:3"
  - Alternative formats: "john 3:16", "psalm 23:1-6", "matthew 5:1-7:29"

Books can be specified using English names (genesis, matthew, 1-samuel, song-of-solomon).
Results are limited to 500 verses maximum.`,
    inputSchema: {
      translationSlug: z.string().describe('Translation slug - call get_bible_translations first to get available options'),
      reference: z.string().describe('Bible reference string (e.g., "genesis 1:1", "john 3:16", "psalm 23")'),
    },
  },
  async (args: { translationSlug?: string; reference?: string }) => {
    const { translationSlug, reference } = args;

    // Validate required parameters
    if (!translationSlug || !reference) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Both translationSlug and reference are required parameters',
            }, null, 2),
          },
        ],
      };
    }

    const result = await getBiblePassage(translationSlug, reference);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// MCP endpoint
app.all('/mcp', async (c) => {
  const transport = new StreamableHTTPTransport();
  await mcpServer.connect(transport);
  return transport.handleRequest(c);
});

export { app as mcpRoute };
