import { db } from '@/db';
import { quotes, verses, type NewQuote } from '@/db/schema';
import { eq, sql, and, gte, lte, or, gt, lt } from 'drizzle-orm';

/**
 * Creates or updates a Bible quote
 * @param quote - The quote data to upsert
 * @returns The created/updated quote with its ID
 */
export async function upsertQuote(quote: NewQuote & { id?: number }): Promise<{ id: number }> {
  const now = new Date().toISOString();

  // If updating an existing quote and publishing it, set publishedAt
  const quoteData = {
    ...quote,
    updatedAt: now,
    ...(quote.published === true && (quote.publishedAt === null || quote.publishedAt === undefined) ? { publishedAt: now } : {}),
  };

  if (quote.id !== undefined) {
    // Update existing quote
    await db
      .update(quotes)
      .set(quoteData)
      .where(eq(quotes.id, quote.id));

    return { id: quote.id };
  }

  // Insert new quote
  const result = await db
    .insert(quotes)
    .values(quoteData)
    .returning({ id: quotes.id });

  return result[0];
}

/**
 * Deletes a quote by ID
 * @param id - The quote ID to delete
 */
export async function deleteQuote(id: number): Promise<void> {
  await db.delete(quotes).where(eq(quotes.id, id));
}

/**
 * Helper function to build verse range conditions for a quote
 * Handles single verse, verse range, chapter range, and cross-book range
 */
function buildVerseRangeCondition(
  quote: {
    startBook: string;
    endBook: string | null;
    startChapter: number;
    endChapter: number | null;
    startVerse: number;
    endVerse: number | null;
  },
  bibleTranslationSlug: string
): ReturnType<typeof and> {
  const conditions = [eq(verses.bibleTranslationSlug, bibleTranslationSlug)];

  const endBook = quote.endBook ?? quote.startBook;
  const endChapter = quote.endChapter ?? quote.startChapter;
  const endVerse = quote.endVerse ?? quote.startVerse;

  if (quote.startBook === endBook) {
    // Same book
    conditions.push(eq(verses.bookSlug, quote.startBook));

    if (quote.startChapter === endChapter) {
      // Same chapter
      conditions.push(eq(verses.chapter, quote.startChapter));
      conditions.push(gte(verses.verse, quote.startVerse));
      conditions.push(lte(verses.verse, endVerse));
    } else {
      // Multiple chapters in same book
      const orCondition = or(
        // Verses in start chapter from startVerse onwards
        and(
          eq(verses.chapter, quote.startChapter),
          gte(verses.verse, quote.startVerse)
        ),
        // All verses in middle chapters
        and(
          gte(verses.chapter, quote.startChapter + 1),
          lte(verses.chapter, endChapter - 1)
        ),
        // Verses in end chapter up to endVerse
        and(
          eq(verses.chapter, endChapter),
          lte(verses.verse, endVerse)
        )
      );
      if (orCondition !== undefined && orCondition !== null) {
        conditions.push(orCondition);
      }
    }
  } else {
    // Cross-book range - complex query
    const innerOr1 = or(
      and(
        eq(verses.chapter, quote.startChapter),
        gte(verses.verse, quote.startVerse)
      ),
      gte(verses.chapter, quote.startChapter + 1)
    );
    const innerOr2 = or(
      lte(verses.chapter, endChapter - 1),
      and(
        eq(verses.chapter, endChapter),
        lte(verses.verse, endVerse)
      )
    );

    const crossBookOr = or(
      // Verses in start book from startChapter:startVerse onwards
      and(
        eq(verses.bookSlug, quote.startBook),
        innerOr1
      ),
      // Verses in end book up to endChapter:endVerse
      and(
        eq(verses.bookSlug, endBook),
        innerOr2
      )
    );

    if (crossBookOr !== undefined && crossBookOr !== null) {
      conditions.push(crossBookOr);
    }
  }

  const finalCondition = and(...conditions);
  if (finalCondition === undefined || finalCondition === null) {
    throw new Error('Failed to build verse range condition');
  }
  return finalCondition;
}

/**
 * Fetches all published quotes with verses
 * @param bibleTranslationSlug - Translation to fetch verses in (required)
 * @param filters - Optional filters for book, chapter, verse, pagination, and publishedAt
 * @returns Array of published quotes with verses
 */
export async function getPublishedQuotes(
  bibleTranslationSlug: string,
  filters?: {
    startBook?: string;
    endBook?: string;
    startChapter?: number;
    endChapter?: number;
    startVerse?: number;
    endVerse?: number;
    limit?: number;
    offset?: number;
    publishedAtGt?: string;
    publishedAtGte?: string;
    publishedAtLt?: string;
    publishedAtLte?: string;
  }
): Promise<{
  id: number;
  userName: string | null;
  reference: string;
  userLanguage: string;
  userNote: string | null;
  verses: {
    bookSlug: string;
    bookName: string;
    chapter: number;
    verse: number;
    text: string;
  }[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}[]> {
  const conditions = [eq(quotes.published, true)];

  // Add book filters (optional)
  if (filters?.startBook !== undefined && filters.startBook !== '') {
    conditions.push(gte(quotes.startBook, filters.startBook));
  }
  if (filters?.endBook !== undefined && filters.endBook !== '') {
    conditions.push(lte(quotes.startBook, filters.endBook));
  }

  // Add chapter filters (optional)
  if (filters?.startChapter !== undefined) {
    conditions.push(gte(quotes.startChapter, filters.startChapter));
  }
  if (filters?.endChapter !== undefined) {
    conditions.push(lte(quotes.startChapter, filters.endChapter));
  }

  // Add verse filters (optional)
  if (filters?.startVerse !== undefined) {
    conditions.push(gte(quotes.startVerse, filters.startVerse));
  }
  if (filters?.endVerse !== undefined) {
    conditions.push(lte(quotes.startVerse, filters.endVerse));
  }

  // Add publishedAt filters (optional)
  if (filters?.publishedAtGt !== undefined && filters.publishedAtGt !== '') {
    conditions.push(gt(quotes.publishedAt, filters.publishedAtGt));
  }
  if (filters?.publishedAtGte !== undefined && filters.publishedAtGte !== '') {
    conditions.push(gte(quotes.publishedAt, filters.publishedAtGte));
  }
  if (filters?.publishedAtLt !== undefined && filters.publishedAtLt !== '') {
    conditions.push(lt(quotes.publishedAt, filters.publishedAtLt));
  }
  if (filters?.publishedAtLte !== undefined && filters.publishedAtLte !== '') {
    conditions.push(lte(quotes.publishedAt, filters.publishedAtLte));
  }

  // Apply pagination (default limit: 50, max: 500)
  const limit = Math.min(filters?.limit ?? 50, 500);
  const offset = filters?.offset ?? 0;

  // Fetch all matching quotes
  const quotesData = await db
    .select({
      id: quotes.id,
      userName: quotes.userName,
      reference: quotes.reference,
      startBook: quotes.startBook,
      endBook: quotes.endBook,
      startChapter: quotes.startChapter,
      endChapter: quotes.endChapter,
      startVerse: quotes.startVerse,
      endVerse: quotes.endVerse,
      userLanguage: quotes.userLanguage,
      userNote: quotes.userNote,
      createdAt: quotes.createdAt,
      updatedAt: quotes.updatedAt,
      publishedAt: quotes.publishedAt,
    })
    .from(quotes)
    .where(and(...conditions))
    .orderBy(sql`${quotes.publishedAt} DESC`)
    .limit(limit)
    .offset(offset);

  if (quotesData.length === 0) {
    return [];
  }

  // Fetch verses for all quotes in a single query using OR conditions
  const verseConditions = quotesData.map(quote => buildVerseRangeCondition(quote, bibleTranslationSlug));

  const verseOrCondition = or(...verseConditions);
  if (verseOrCondition === undefined || verseOrCondition === null) {
    return [];
  }

  const allVerses = await db
    .select({
      bookSlug: verses.bookSlug,
      bookName: verses.bookName,
      chapter: verses.chapter,
      verse: verses.verse,
      text: verses.text,
    })
    .from(verses)
    .where(verseOrCondition);

  // Group verses by quote
  const result = quotesData.map(quote => {
    // Filter verses that belong to this quote
    const quoteVerses = allVerses.filter(v => {

      const endBook = quote.endBook ?? quote.startBook;
      const endChapter = quote.endChapter ?? quote.startChapter;
      const endVerse = quote.endVerse ?? quote.startVerse;

      // Check if verse is in range
      if (quote.startBook === endBook) {
        // Same book
        if (v.bookSlug !== quote.startBook) {
          return false;
        }

        if (quote.startChapter === endChapter) {
          // Same chapter
          return v.chapter === quote.startChapter &&
                 v.verse >= quote.startVerse &&
                 v.verse <= endVerse;
        } else {
          // Multiple chapters
          if (v.chapter === quote.startChapter) {
            return v.verse >= quote.startVerse;
          }
          if (v.chapter === endChapter) {
            return v.verse <= endVerse;
          }
          return v.chapter > quote.startChapter && v.chapter < endChapter;
        }
      } else {
        // Cross-book range
        if (v.bookSlug === quote.startBook) {
          if (v.chapter === quote.startChapter) {
            return v.verse >= quote.startVerse;
          }
          return v.chapter > quote.startChapter;
        }
        if (v.bookSlug === endBook) {
          if (v.chapter === endChapter) {
            return v.verse <= endVerse;
          }
          return v.chapter < endChapter;
        }
        return false;
      }
    }).sort((a, b) => {
      // Sort verses by book, chapter, verse
      if (a.bookSlug !== b.bookSlug) {
        return a.bookSlug.localeCompare(b.bookSlug);
      }
      if (a.chapter !== b.chapter) {
        return a.chapter - b.chapter;
      }
      return a.verse - b.verse;
    });

    return {
      id: quote.id,
      userName: quote.userName,
      reference: quote.reference,
      userLanguage: quote.userLanguage,
      userNote: quote.userNote,
      verses: quoteVerses,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      publishedAt: quote.publishedAt,
    };
  });

  return result;
}
