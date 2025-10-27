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
 * Normalize a string for comparison by removing diacritics and converting to lowercase
 * - Removes diacritics (e.g., "Împăraţi" -> "imparati")
 * - Converts to lowercase
 * - Normalizes spaces and non-alphanumeric characters
 * - Trims whitespace
 */
export function normalizeForComparison(text: string): string {
  return text
    .normalize('NFD') // Decompose characters with diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

/**
 * Normalize a string for partial matching by removing all non-alphanumeric characters
 * Used for flexible book name matching (e.g., "1 Imp" matches "1 Împăraţi")
 */
export function normalizeForPartialMatch(text: string): string {
  return normalizeForComparison(text)
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
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
 * Supports partial matching (e.g., "1 imp" matches "1 Împăraţi")
 */
async function parseBookFromReference(
  bookPart: string,
  bibleTranslationSlug: string
): Promise<string | null> {
  const normalizedBookPart = normalizeForComparison(bookPart);
  const normalizedForPartial = normalizeForPartialMatch(bookPart);

  // First, try to match against English book slugs
  const bookSlugs = getBookSlugs();

  // Try exact match on English slugs
  if (bookSlugs.includes(normalizedBookPart)) {
    return normalizedBookPart;
  }

  // Try partial match on English slugs (e.g., "1 sam" -> "1-samuel")
  const englishPartialMatches = bookSlugs.filter(slug => {
    const normalizedSlug = normalizeForPartialMatch(slug);
    return normalizedSlug.startsWith(normalizedForPartial);
  });

  // If exactly one partial match, use it
  if (englishPartialMatches.length === 1) {
    return englishPartialMatches[0];
  }

  // Fallback: query database for localized book names
  const result = await db
    .select({ bookSlug: verses.bookSlug, bookName: verses.bookName })
    .from(verses)
    .where(sql`${verses.bibleTranslationSlug} = ${bibleTranslationSlug}`)
    .groupBy(verses.bookSlug, verses.bookName);

  // Try exact match on normalized localized book names
  const exactMatch = result.find(row =>
    normalizeForComparison(row.bookName) === normalizedBookPart
  );

  if (exactMatch !== undefined) {
    return exactMatch.bookSlug;
  }

  // Try partial match on normalized localized book names
  const localizedPartialMatches = result.filter(row => {
    const normalizedName = normalizeForPartialMatch(row.bookName);
    return normalizedName.startsWith(normalizedForPartial);
  });

  // If exactly one partial match, use it
  if (localizedPartialMatches.length === 1) {
    return localizedPartialMatches[0].bookSlug;
  }

  // If multiple partial matches, return the shortest one (most specific)
  if (localizedPartialMatches.length > 1) {
    const sorted = localizedPartialMatches.sort((a, b) =>
      a.bookName.length - b.bookName.length
    );
    return sorted[0].bookSlug;
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
  bibleTranslationSlug: string
): Promise<{ book: string; chapter: number; verse: number } | null> {
  // Match pattern: "book chapter:verse"
  // This regex handles multi-word books like "1 samuel" or "song of solomon"
  const regex = /^(.+?)\s+(\d+):(\d+)$/;
  const match = regex.exec(part);

  if (match === null) {
    return null;
  }

  const [, bookPart, chapterStr, verseStr] = match;
  const book = await parseBookFromReference(bookPart, bibleTranslationSlug);

  if (book === null || book === '') {
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
  const regex = /^(\d+):(\d+)$/;
  const match = regex.exec(part);
  if (match === null) {
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
 * @param bibleTranslationSlug The translation slug for book name resolution
 * @returns Parsed reference or null if invalid
 */
export async function parseReference(
  reference: string,
  bibleTranslationSlug: string
): Promise<ParsedReference | null> {
  const cleaned = cleanReference(reference);

  // Split by dash (our normalized separator)
  const parts = cleaned.split('-');

  if (parts.length === 0 || parts.length > 2) {
    return null;
  }

  // Parse the start reference
  const startPart = await parseReferencePart(parts[0], bibleTranslationSlug);
  if (startPart === null) {
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
  const endPartFull = await parseReferencePart(endPartRaw, bibleTranslationSlug);
  if (endPartFull !== null) {
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
  if (endChapterVerse !== null) {
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
  const verseRegex = /^(\d+)$/;
  const verseMatch = verseRegex.exec(endPartRaw);
  if (verseMatch !== null) {
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
