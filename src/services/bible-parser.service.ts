/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { db, translations, verses, type NewVerse } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import {
  readXMLFile,
  extractMetadataFromFilename,
  extractTranslationName,
  parseBibleXML,
} from '../utils/xml-parser.js';
import { BOOK_NAMES, getTestament } from '../utils/book-names.js';
import { getTranslationSlug, getBookSlug } from '../utils/slugify.js';

export interface UploadResult {
  success: boolean;
  translationId?: number;
  bibleTranslationSlug?: string;
  stats?: {
    booksProcessed: number;
    chaptersProcessed: number;
    versesUpserted: number;
  };
  error?: string;
}

/**
 * Upsert translation metadata
 * Creates a new translation or updates existing one
 */
async function upsertTranslation(
  language: string,
  abbreviation: string,
  name: string,
  customSlug?: string
): Promise<{ id: number; slug: string }> {
  const slug = customSlug ?? getTranslationSlug(abbreviation);

  logger.debug(`Upserting translation: ${language}/${abbreviation} (slug: ${slug})`);

  // Check if translation exists by slug
  const existing = await db
    .select()
    .from(translations)
    .where(eq(translations.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    logger.info(`Translation ${slug} already exists (ID: ${existing[0].id}), will update`);

    // Update existing translation
    await db
      .update(translations)
      .set({
        language,
        abbreviation,
        name,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(translations.id, existing[0].id));

    return { id: existing[0].id, slug: existing[0].slug };
  }

  // Insert new translation
  const result = await db
    .insert(translations)
    .values({
      slug,
      language,
      abbreviation,
      name,
      totalBooks: 0,
      totalChapters: 0,
      totalVerses: 0,
    })
    .returning({ id: translations.id, slug: translations.slug });

  logger.info(`Created new translation: ${slug} (ID: ${result[0].id})`);
  return { id: result[0].id, slug: result[0].slug };
}

/**
 * Delete all verses for a specific translation
 * Used to clean up before re-importing
 */
async function deleteTranslationVerses(bibleTranslationSlug: string): Promise<void> {
  logger.debug(`Deleting existing verses for translation: ${bibleTranslationSlug}`);

  await db.delete(verses).where(eq(verses.bibleTranslationSlug, bibleTranslationSlug));

  logger.info(`Deleted all verses for translation: ${bibleTranslationSlug}`);
}

/**
 * Bulk upsert verses in batches for optimal performance
 * Chunks large arrays to avoid overwhelming the database
 */
async function bulkUpsertVerses(versesToUpsert: NewVerse[]): Promise<number> {
  if (versesToUpsert.length === 0) {
    return 0;
  }

  const BATCH_SIZE = 1000;
  let totalUpserted = 0;

  // Process in batches
  for (let i = 0; i < versesToUpsert.length; i += BATCH_SIZE) {
    const batch = versesToUpsert.slice(i, i + BATCH_SIZE);

    logger.debug(`Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} verses`);

    await db
      .insert(verses)
      .values(batch)
      .onConflictDoUpdate({
        target: [verses.bibleTranslationSlug, verses.bookSlug, verses.chapter, verses.verse],
        set: {
          text: verses.text,
          bookName: verses.bookName,
          testament: verses.testament,
        },
      });

    totalUpserted += batch.length;

    if ((i + BATCH_SIZE) % 5000 === 0) {
      logger.info(`Progress: ${totalUpserted} verses upserted...`);
    }
  }

  return totalUpserted;
}

/**
 * Upload a Bible translation from XML to Turso database
 * Uses bulk upserts for optimal performance
 *
 * @param xmlFilePath - Path to the USFX XML file
 * @param customName - Optional custom name for the translation
 * @param customSlug - Optional custom slug (defaults to abbreviation)
 * @returns UploadResult with success status and stats
 */
export async function uploadBibleTranslation(
  xmlFilePath: string,
  customName?: string,
  customSlug?: string
): Promise<UploadResult> {
  try {
    logger.info(`Starting Bible upload from: ${xmlFilePath}`);

    // Step 1: Read XML file
    const xmlContent = readXMLFile(xmlFilePath);
    logger.debug('XML file read successfully');

    // Step 2: Extract metadata
    const fileMetadata = extractMetadataFromFilename(xmlFilePath);
    const translationNameFromXml = extractTranslationName(xmlContent);
    const translationName =
      customName ||
      translationNameFromXml ||
      `${fileMetadata.language.toUpperCase()} ${fileMetadata.abbreviation.toUpperCase()}`;

    logger.info(`Translation: ${translationName} (${fileMetadata.language}/${fileMetadata.abbreviation})`);

    // Step 3: Parse XML content
    logger.debug('Parsing XML content...');
    const parsedBooks = parseBibleXML(xmlContent, BOOK_NAMES);
    logger.info(`Parsed ${parsedBooks.length} books from XML`);

    // Step 4: Upsert translation
    const translation = await upsertTranslation(
      fileMetadata.language,
      fileMetadata.abbreviation,
      translationName,
      customSlug
    );

    logger.info(`Using translation slug: ${translation.slug}`);

    // Step 5: Delete existing verses for this translation (clean slate)
    await deleteTranslationVerses(translation.slug);

    // Step 6: Collect ALL verses into a single array for bulk upsert
    logger.info('Collecting all verses for bulk upsert...');
    const allVerses: NewVerse[] = [];
    let totalChapters = 0;

    for (const book of parsedBooks) {
      const bookSlug = getBookSlug(book.bookId); // Generate English slug from book ID
      const testament = getTestament(book.bookId);

      logger.debug(`Processing book: ${book.bookId} (${book.bookTitle}) -> English slug: ${bookSlug}`);

      for (const chapter of book.chapters) {
        totalChapters++;

        for (const [_verseId, verseData] of Object.entries(chapter.verses)) {
          allVerses.push({
            translationId: translation.id,
            bibleTranslationSlug: translation.slug,
            bookSlug, // English book slug (e.g., 'genesis', 'matthew')
            bookName: book.bookTitle, // Localized book name (e.g., 'Geneza', 'Matei')
            testament,
            chapter: chapter.chapter,
            verse: verseData.id,
            text: verseData.text,
          });
        }
      }
    }

    logger.info(`Collected ${allVerses.length} verses from ${parsedBooks.length} books`);

    // Step 7: Bulk upsert all verses
    logger.info('Starting bulk upsert...');
    const versesUpserted = await bulkUpsertVerses(allVerses);

    // Step 8: Update translation statistics
    await db
      .update(translations)
      .set({
        totalBooks: parsedBooks.length,
        totalChapters,
        totalVerses: versesUpserted,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(translations.id, translation.id));

    logger.info('='.repeat(60));
    logger.info(`Upload complete! Translation: ${translation.slug} (ID: ${translation.id})`);
    logger.info(`  Books: ${parsedBooks.length}`);
    logger.info(`  Chapters: ${totalChapters}`);
    logger.info(`  Verses: ${versesUpserted}`);
    logger.info('='.repeat(60));

    return {
      success: true,
      translationId: translation.id,
      bibleTranslationSlug: translation.slug,
      stats: {
        booksProcessed: parsedBooks.length,
        chaptersProcessed: totalChapters,
        versesUpserted,
      },
    };
  } catch (error) {
    logger.error('Failed to upload Bible translation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
