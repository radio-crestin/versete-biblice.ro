import { db, verses } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { BIBLE_BOOK_ORDER, getBookIndex } from '@/constants/bible-book-order.js';

export interface BookData {
  bookIndex: number;
  slug: string;
  name: string;
  maxChapter: number;
  versesByChapter: Record<number, number>;
}

/**
 * Generate books data for a specific translation
 * Fetches all verses, groups by book, and calculates chapter/verse structure
 */
export async function generateBooksData(translationSlug: string): Promise<BookData[]> {
  console.info(`📚 Generating books data for translation: ${translationSlug}`);

  // Fetch all verses for this translation
  const translationVerses = await db
    .select({
      bookSlug: verses.bookSlug,
      bookName: verses.bookName,
      chapter: verses.chapter,
      verse: verses.verse,
    })
    .from(verses)
    .where(eq(verses.bibleTranslationSlug, translationSlug))
    .orderBy(verses.bookSlug, verses.chapter, verses.verse);

  console.info(`✅ Found ${String(translationVerses.length)} verses for ${translationSlug}`);

  // Group by book and calculate structure
  const booksMap = new Map<string, BookData>();

  for (const verse of translationVerses) {
    if (!booksMap.has(verse.bookSlug)) {
      booksMap.set(verse.bookSlug, {
        bookIndex: getBookIndex(verse.bookSlug),
        slug: verse.bookSlug,
        name: verse.bookName,
        maxChapter: 0,
        versesByChapter: {},
      });
    }

    const book = booksMap.get(verse.bookSlug);
    if (book === undefined) {
      continue;
    }

    // Update max chapter
    if (verse.chapter > book.maxChapter) {
      book.maxChapter = verse.chapter;
    }

    // Update max verse for this chapter
    const currentMax = book.versesByChapter[verse.chapter];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (currentMax === undefined || verse.verse > currentMax) {
      book.versesByChapter[verse.chapter] = verse.verse;
    }
  }

  // Convert map to array and sort by Bible order
  const books = Array.from(booksMap.values()).sort((a, b) => {
    const indexA = BIBLE_BOOK_ORDER.indexOf(a.slug as typeof BIBLE_BOOK_ORDER[number]);
    const indexB = BIBLE_BOOK_ORDER.indexOf(b.slug as typeof BIBLE_BOOK_ORDER[number]);
    return indexA - indexB;
  });

  console.info(`✅ Generated data for ${String(books.length)} books`);

  return books;
}

