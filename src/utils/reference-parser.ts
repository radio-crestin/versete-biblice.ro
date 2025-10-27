import { db, verses } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { getBookSlugs } from './dynamic-schema.js';

export interface ParsedReference {
  book: string;
  chapter: number;
  verse: number;
  endBook?: string;
  endChapter?: number;
  endVerse?: number;
}

/**
 * Clean and normalize a reference string
 * - Trim whitespace
 * - Normalize separators
 * - Remove extra spaces
 */
function cleanReference(reference: string): string {
  return reference
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/\s*->\s*/g, '-') // Normalize -> to -
    .replace(/\s+to\s+/gi, '-') // Normalize "to" to -
    .replace(/\s*:\s*/g, ':') // Normalize : spacing
    .replace(/\s*-\s*/g, '-'); // Normalize - spacing
}

/**
 * Get book slug from reference string
 * Tries to match English book slugs first, then falls back to database lookup
 */
async function parseBookFromReference(
  bookPart: string,
  translationSlug: string
): Promise<string | null> {
  const normalizedBookPart = bookPart.toLowerCase().trim();

  // First, try to match against English book slugs
  const bookSlugs = getBookSlugs();

  // Try exact match
  if (bookSlugs.includes(normalizedBookPart)) {
    return normalizedBookPart;
  }

  // Try partial match (for cases where user might type "1 sam" for "1-samuel")
  const partialMatch = bookSlugs.find(slug =>
    slug.startsWith(normalizedBookPart) ||
    normalizedBookPart.startsWith(slug.split('-')[0])
  );

  if (partialMatch) {
    return partialMatch;
  }

  // Fallback: query database for localized book names
  const result = await db
    .select({ bookSlug: verses.bookSlug })
    .from(verses)
    .where(
      sql`LOWER(${verses.bookName}) = ${normalizedBookPart} AND ${verses.translationSlug} = ${translationSlug}`
    )
    .limit(1);

  if (result.length > 0) {
    return result[0].bookSlug;
  }

  return null;
}

/**
 * Parse a single reference part (book chapter:verse)
 * Examples:
 *   - "genesis 1:1" -> { book: "genesis", chapter: 1, verse: 1 }
 *   - "1 samuel 3:5" -> { book: "1-samuel", chapter: 3, verse: 5 }
 */
async function parseReferencePart(
  part: string,
  translationSlug: string
): Promise<{ book: string; chapter: number; verse: number } | null> {
  // Match pattern: "book chapter:verse"
  // This regex handles multi-word books like "1 samuel" or "song of solomon"
  const match = part.match(/^(.+?)\s+(\d+):(\d+)$/);

  if (!match) {
    return null;
  }

  const [, bookPart, chapterStr, verseStr] = match;
  const book = await parseBookFromReference(bookPart, translationSlug);

  if (!book) {
    return null;
  }

  return {
    book,
    chapter: parseInt(chapterStr, 10),
    verse: parseInt(verseStr, 10),
  };
}

/**
 * Parse chapter:verse from a string
 * Examples:
 *   - "1:1" -> { chapter: 1, verse: 1 }
 *   - "2:5" -> { chapter: 2, verse: 5 }
 */
function parseChapterVerse(part: string): { chapter: number; verse: number } | null {
  const match = part.match(/^(\d+):(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    chapter: parseInt(match[1], 10),
    verse: parseInt(match[2], 10),
  };
}

/**
 * Parse a Bible reference string into structured data
 *
 * Supported formats:
 * - "genesis 1:1" - single verse
 * - "genesis 1:1-5" - verse range in same chapter
 * - "genesis 1:1-2:5" - chapter range
 * - "genesis 1:1-exodus 2:3" - cross-book range
 * - Alternative separators: "-", "to", "->"
 *
 * @param reference The reference string to parse
 * @param translationSlug The translation slug for book name resolution
 * @returns Parsed reference or null if invalid
 */
export async function parseReference(
  reference: string,
  translationSlug: string
): Promise<ParsedReference | null> {
  const cleaned = cleanReference(reference);

  // Split by dash (our normalized separator)
  const parts = cleaned.split('-');

  if (parts.length === 0 || parts.length > 2) {
    return null;
  }

  // Parse the start reference
  const startPart = await parseReferencePart(parts[0], translationSlug);
  if (!startPart) {
    return null;
  }

  // If no end part, return single verse
  if (parts.length === 1) {
    return {
      book: startPart.book,
      chapter: startPart.chapter,
      verse: startPart.verse,
    };
  }

  // Parse the end part
  const endPartRaw = parts[1];

  // Try to parse as full reference (book chapter:verse)
  const endPartFull = await parseReferencePart(endPartRaw, translationSlug);
  if (endPartFull) {
    // Cross-book or explicit book range
    return {
      book: startPart.book,
      chapter: startPart.chapter,
      verse: startPart.verse,
      endBook: endPartFull.book,
      endChapter: endPartFull.chapter,
      endVerse: endPartFull.verse,
    };
  }

  // Try to parse as chapter:verse (same book)
  const endChapterVerse = parseChapterVerse(endPartRaw);
  if (endChapterVerse) {
    return {
      book: startPart.book,
      chapter: startPart.chapter,
      verse: startPart.verse,
      endBook: startPart.book,
      endChapter: endChapterVerse.chapter,
      endVerse: endChapterVerse.verse,
    };
  }

  // Try to parse as just a verse number (same book and chapter)
  const verseMatch = endPartRaw.match(/^(\d+)$/);
  if (verseMatch) {
    return {
      book: startPart.book,
      chapter: startPart.chapter,
      verse: startPart.verse,
      endBook: startPart.book,
      endChapter: startPart.chapter,
      endVerse: parseInt(verseMatch[1], 10),
    };
  }

  // Invalid end part
  return null;
}
