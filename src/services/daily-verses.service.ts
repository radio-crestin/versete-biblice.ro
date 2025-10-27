import { db } from '@/db';
import { dailyVersePool, dailyVerseScheduled, verses, type NewDailyVerseScheduled } from '@/db/schema';
import { eq, and, gte, lte, or, asc } from 'drizzle-orm';

/**
 * Helper function to build verse range conditions for a daily verse
 * Similar to the buildVerseRangeCondition in quotes.service.ts
 */
function buildVerseRangeCondition(
  verseRef: {
    startBook: string;
    endBook: string;
    startChapter: number;
    endChapter: number;
    startVerse: number;
    endVerse: number;
  },
  bibleTranslationSlug: string
): ReturnType<typeof and> {
  const conditions = [eq(verses.bibleTranslationSlug, bibleTranslationSlug)];

  if (verseRef.startBook === verseRef.endBook) {
    // Same book
    conditions.push(eq(verses.bookSlug, verseRef.startBook));

    if (verseRef.startChapter === verseRef.endChapter) {
      // Same chapter
      conditions.push(eq(verses.chapter, verseRef.startChapter));
      conditions.push(gte(verses.verse, verseRef.startVerse));
      conditions.push(lte(verses.verse, verseRef.endVerse));
    } else {
      // Multiple chapters in same book
      const orCondition = or(
        // Verses in start chapter from startVerse onwards
        and(
          eq(verses.chapter, verseRef.startChapter),
          gte(verses.verse, verseRef.startVerse)
        ),
        // All verses in middle chapters
        and(
          gte(verses.chapter, verseRef.startChapter + 1),
          lte(verses.chapter, verseRef.endChapter - 1)
        ),
        // Verses in end chapter up to endVerse
        and(
          eq(verses.chapter, verseRef.endChapter),
          lte(verses.verse, verseRef.endVerse)
        )
      );
      if (orCondition !== undefined) {
        conditions.push(orCondition);
      }
    }
  } else {
    // Cross-book range - complex query
    const innerOr1 = or(
      and(
        eq(verses.chapter, verseRef.startChapter),
        gte(verses.verse, verseRef.startVerse)
      ),
      gte(verses.chapter, verseRef.startChapter + 1)
    );
    const innerOr2 = or(
      lte(verses.chapter, verseRef.endChapter - 1),
      and(
        eq(verses.chapter, verseRef.endChapter),
        lte(verses.verse, verseRef.endVerse)
      )
    );

    const crossBookOr = or(
      // Verses in start book from startChapter:startVerse onwards
      and(
        eq(verses.bookSlug, verseRef.startBook),
        innerOr1
      ),
      // Verses in end book up to endChapter:endVerse
      and(
        eq(verses.bookSlug, verseRef.endBook),
        innerOr2
      )
    );

    if (crossBookOr !== undefined) {
      conditions.push(crossBookOr);
    }
  }

  return and(...conditions);
}

/**
 * Helper to generate a reference string from a verse pool entry
 */
function generateReference(verse: {
  startBook: string;
  startChapter: number;
  startVerse: number;
  endBook: string;
  endChapter: number;
  endVerse: number;
}): string {
  const formatBookName = (slug: string): string => {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const startBook = formatBookName(verse.startBook);
  const endBook = formatBookName(verse.endBook);

  if (verse.startBook === verse.endBook && verse.startChapter === verse.endChapter && verse.startVerse === verse.endVerse) {
    // Single verse: "Genesis 1:1"
    return `${startBook} ${String(verse.startChapter)}:${String(verse.startVerse)}`;
  } else if (verse.startBook === verse.endBook && verse.startChapter === verse.endChapter) {
    // Verse range in same chapter: "Genesis 1:1-5"
    return `${startBook} ${String(verse.startChapter)}:${String(verse.startVerse)}-${String(verse.endVerse)}`;
  } else if (verse.startBook === verse.endBook) {
    // Chapter range in same book: "Genesis 1:1 - 2:5"
    return `${startBook} ${String(verse.startChapter)}:${String(verse.startVerse)} - ${String(verse.endChapter)}:${String(verse.endVerse)}`;
  } else {
    // Cross-book range: "Genesis 1:1 - Exodus 2:3"
    return `${startBook} ${String(verse.startChapter)}:${String(verse.startVerse)} - ${endBook} ${String(verse.endChapter)}:${String(verse.endVerse)}`;
  }
}

/**
 * Weighted random selection - prioritizes least recently scheduled verses
 * Returns a random verse with higher probability for older lastScheduledAt values
 */
function selectWeightedRandom(poolVerses: {
  id: number;
  lastScheduledAt: string | null;
  scheduleCount: number;
}[]): number {
  // Sort by lastScheduledAt (oldest first, null values first)
  const sorted = [...poolVerses].sort((a, b) => {
    if (a.lastScheduledAt === null && b.lastScheduledAt === null) {
      return 0;
    }
    if (a.lastScheduledAt === null) {
      return -1; // null comes first
    }
    if (b.lastScheduledAt === null) {
      return 1;
    }
    return new Date(a.lastScheduledAt).getTime() - new Date(b.lastScheduledAt).getTime();
  });

  // Take the oldest 90 verses (or all if less than 90)
  const candidates = sorted.slice(0, Math.min(90, sorted.length));

  // Random selection from candidates
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex].id;
}

/**
 * Schedules verses for a specific month
 * Uses an efficient algorithm with only 3 SQL queries total:
 * 1. Fetch all pool verses
 * 2. Bulk insert scheduled verses
 * 3. Bulk update lastScheduledAt and scheduleCount
 */
export async function scheduleMonthlyVerses(year: number, month: number): Promise<void> {
  // Fetch all pool verses in a single query
  const poolVerses = await db
    .select({
      id: dailyVersePool.id,
      publishDate: dailyVersePool.publishDate,
      lastScheduledAt: dailyVersePool.lastScheduledAt,
      scheduleCount: dailyVersePool.scheduleCount,
    })
    .from(dailyVersePool);

  if (poolVerses.length === 0) {
    console.warn(`No verses in pool to schedule for ${String(year)}-${String(month)}`);
    return;
  }

  // Generate all dates for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
  }

  // Select verses for each day
  const scheduledEntries: NewDailyVerseScheduled[] = [];
  const selectedVerseIds = new Map<number, number>(); // verseId -> count

  for (const date of dates) {
    const dateObj = new Date(date);
    const monthDay = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`; // MM-DD

    // Filter verses with matching publishDate (if any)
    const versesWithPublishDate = poolVerses.filter(v => v.publishDate === monthDay);

    let selectedVerseId: number;
    if (versesWithPublishDate.length > 0) {
      // Select from verses with matching publish date
      selectedVerseId = selectWeightedRandom(versesWithPublishDate);
    } else {
      // Select from all verses
      selectedVerseId = selectWeightedRandom(poolVerses);
    }

    scheduledEntries.push({
      date,
      versePoolId: selectedVerseId,
    });

    // Track selection count
    selectedVerseIds.set(selectedVerseId, (selectedVerseIds.get(selectedVerseId) ?? 0) + 1);
  }

  // Bulk insert scheduled verses
  if (scheduledEntries.length > 0) {
    await db.insert(dailyVerseScheduled).values(scheduledEntries);
  }

  // Bulk update lastScheduledAt and scheduleCount for selected verses
  const now = new Date().toISOString();
  for (const [verseId, count] of selectedVerseIds.entries()) {
    const currentVerse = poolVerses.find(v => v.id === verseId);
    if (currentVerse !== undefined) {
      await db
        .update(dailyVersePool)
        .set({
          lastScheduledAt: now,
          scheduleCount: currentVerse.scheduleCount + count,
          updatedAt: now,
        })
        .where(eq(dailyVersePool.id, verseId));
    }
  }

  console.info(`Scheduled ${String(scheduledEntries.length)} verses for ${String(year)}-${String(month)}`);
}

/**
 * Ensures verses are scheduled for the next 2 months (on first run)
 * or the next 1 month (on subsequent runs) to maintain a 1-month buffer
 */
export async function ensureScheduledVerses(): Promise<void> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Calculate next month and month after
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  const monthAfter = nextMonth === 12 ? 1 : nextMonth + 1;
  const monthAfterYear = nextMonth === 12 ? nextMonthYear + 1 : nextMonthYear;

  // Check if we have scheduled verses for next month
  const nextMonthStart = new Date(nextMonthYear, nextMonth - 1, 1).toISOString().split('T')[0];
  const nextMonthEnd = new Date(nextMonthYear, nextMonth, 0).toISOString().split('T')[0];

  const nextMonthScheduled = await db
    .select({ id: dailyVerseScheduled.id })
    .from(dailyVerseScheduled)
    .where(and(
      gte(dailyVerseScheduled.date, nextMonthStart),
      lte(dailyVerseScheduled.date, nextMonthEnd)
    ))
    .limit(1);

  if (nextMonthScheduled.length === 0) {
    // First run: schedule for next 2 months
    console.info('First run detected. Scheduling for next 2 months...');
    await scheduleMonthlyVerses(nextMonthYear, nextMonth);
    await scheduleMonthlyVerses(monthAfterYear, monthAfter);
  } else {
    // Check if we have scheduled verses for the month after next
    const monthAfterStart = new Date(monthAfterYear, monthAfter - 1, 1).toISOString().split('T')[0];
    const monthAfterEnd = new Date(monthAfterYear, monthAfter, 0).toISOString().split('T')[0];

    const monthAfterScheduled = await db
      .select({ id: dailyVerseScheduled.id })
      .from(dailyVerseScheduled)
      .where(and(
        gte(dailyVerseScheduled.date, monthAfterStart),
        lte(dailyVerseScheduled.date, monthAfterEnd)
      ))
      .limit(1);

    if (monthAfterScheduled.length === 0) {
      // Schedule for the month after next
      console.info(`Scheduling for ${String(monthAfterYear)}-${String(monthAfter)}...`);
      await scheduleMonthlyVerses(monthAfterYear, monthAfter);
    } else {
      console.info('Verses already scheduled for the next 2 months. Nothing to do.');
    }
  }
}

/**
 * Fetches a single daily verse with verses text
 * @param date - The date for the daily verse (YYYY-MM-DD). Defaults to today.
 * @param bibleTranslationSlug - Translation to fetch verses in.
 * @returns Daily verse with verses text or null if not found
 */
export async function getDailyVerse(
  date: string | undefined,
  bibleTranslationSlug: string
): Promise<{
  date: string;
  reference: string;
  verses: {
    bookSlug: string;
    bookName: string;
    chapter: number;
    verse: number;
    text: string;
  }[];
} | null> {
  // Default to today if no date provided
  const targetDate = date ?? new Date().toISOString().split('T')[0];

  // Fetch scheduled verse for the date
  const scheduled = await db
    .select({
      date: dailyVerseScheduled.date,
      startBook: dailyVersePool.startBook,
      startChapter: dailyVersePool.startChapter,
      startVerse: dailyVersePool.startVerse,
      endBook: dailyVersePool.endBook,
      endChapter: dailyVersePool.endChapter,
      endVerse: dailyVersePool.endVerse,
    })
    .from(dailyVerseScheduled)
    .innerJoin(dailyVersePool, eq(dailyVerseScheduled.versePoolId, dailyVersePool.id))
    .where(eq(dailyVerseScheduled.date, targetDate))
    .limit(1);

  if (scheduled.length === 0) {
    return null;
  }

  const verseData = scheduled[0];

  // Build verse range condition
  const condition = buildVerseRangeCondition(
    {
      startBook: verseData.startBook,
      endBook: verseData.endBook,
      startChapter: verseData.startChapter,
      endChapter: verseData.endChapter,
      startVerse: verseData.startVerse,
      endVerse: verseData.endVerse,
    },
    bibleTranslationSlug
  );

  // Fetch verses
  const versesData = await db
    .select({
      bookSlug: verses.bookSlug,
      bookName: verses.bookName,
      chapter: verses.chapter,
      verse: verses.verse,
      text: verses.text,
    })
    .from(verses)
    .where(condition)
    .orderBy(asc(verses.chapter), asc(verses.verse));

  // Generate reference string
  const reference = generateReference(verseData);

  return {
    date: verseData.date,
    reference,
    verses: versesData,
  };
}

/**
 * Fetches daily verses between two dates with verses text
 * @param startDate - The start date (YYYY-MM-DD)
 * @param endDate - The end date (YYYY-MM-DD)
 * @param bibleTranslationSlug - Translation to fetch verses in.
 * @returns Array of daily verses with verses text
 */
export async function getDailyVersesBetweenDates(
  startDate: string,
  endDate: string,
  bibleTranslationSlug: string
): Promise<{
  date: string;
  reference: string;
  verses: {
    bookSlug: string;
    bookName: string;
    chapter: number;
    verse: number;
    text: string;
  }[];
}[]> {
  // Fetch scheduled verses for the date range
  const scheduled = await db
    .select({
      date: dailyVerseScheduled.date,
      versePoolId: dailyVerseScheduled.versePoolId,
      startBook: dailyVersePool.startBook,
      startChapter: dailyVersePool.startChapter,
      startVerse: dailyVersePool.startVerse,
      endBook: dailyVersePool.endBook,
      endChapter: dailyVersePool.endChapter,
      endVerse: dailyVersePool.endVerse,
    })
    .from(dailyVerseScheduled)
    .innerJoin(dailyVersePool, eq(dailyVerseScheduled.versePoolId, dailyVersePool.id))
    .where(and(
      gte(dailyVerseScheduled.date, startDate),
      lte(dailyVerseScheduled.date, endDate)
    ))
    .orderBy(asc(dailyVerseScheduled.date));

  if (scheduled.length === 0) {
    return [];
  }

  // Fetch verses for all scheduled entries in a single query using OR conditions
  const verseConditions = scheduled.map(s => buildVerseRangeCondition(
    {
      startBook: s.startBook,
      endBook: s.endBook,
      startChapter: s.startChapter,
      endChapter: s.endChapter,
      startVerse: s.startVerse,
      endVerse: s.endVerse,
    },
    bibleTranslationSlug
  ));

  const allVerses = await db
    .select({
      bookSlug: verses.bookSlug,
      bookName: verses.bookName,
      chapter: verses.chapter,
      verse: verses.verse,
      text: verses.text,
    })
    .from(verses)
    .where(or(...verseConditions));

  // Group verses by scheduled entry
  const result = scheduled.map(entry => {
    // Filter verses that belong to this entry
    const entryVerses = allVerses.filter(v => {
      // Check if verse is in range
      if (entry.startBook === entry.endBook) {
        // Same book
        if (v.bookSlug !== entry.startBook) {
          return false;
        }

        if (entry.startChapter === entry.endChapter) {
          // Same chapter
          return v.chapter === entry.startChapter &&
                 v.verse >= entry.startVerse &&
                 v.verse <= entry.endVerse;
        } else {
          // Multiple chapters
          if (v.chapter === entry.startChapter) {
            return v.verse >= entry.startVerse;
          }
          if (v.chapter === entry.endChapter) {
            return v.verse <= entry.endVerse;
          }
          return v.chapter > entry.startChapter && v.chapter < entry.endChapter;
        }
      } else {
        // Cross-book range
        if (v.bookSlug === entry.startBook) {
          if (v.chapter === entry.startChapter) {
            return v.verse >= entry.startVerse;
          }
          return v.chapter > entry.startChapter;
        }
        if (v.bookSlug === entry.endBook) {
          if (v.chapter === entry.endChapter) {
            return v.verse <= entry.endVerse;
          }
          return v.chapter < entry.endChapter;
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
      date: entry.date,
      reference: generateReference(entry),
      verses: entryVerses,
    };
  });

  return result;
}
