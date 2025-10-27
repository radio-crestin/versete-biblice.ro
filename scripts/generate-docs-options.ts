import { db, translations, verses } from '../src/db/index.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sql, and, eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BookData {
  slug: string;
  name: string;
  maxChapter: number;
  chapters: Record<number, number>; // chapter number -> max verse
}

/**
 * Build-time script to fetch all translations from database and save to JSON
 * This runs before deployment to avoid database queries at module initialization
 */
async function generateTranslations() {
  console.log('📖 Fetching translations from database...');

  try {
    // Fetch all translations
    const results = await db
      .select({
        slug: translations.slug,
        language: translations.language,
        name: translations.name,
      })
      .from(translations)
      .orderBy(translations.language, translations.name);

    console.log(`✅ Found ${results.length} translations`);

    // Create output data
    const output = {
      translations: results,
      generatedAt: new Date().toISOString(),
    };

    // Write to JSON file in src/data directory
    const outputPath = join(__dirname, '../src/data/translations.json');
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`💾 Saved translations to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating translations:', error);
    throw error;
  }
}

/**
 * Fetch all book data from VDCC translation including max chapters and verses
 */
async function generateVdccBooks() {
  console.log('📚 Fetching VDCC book data from database...');

  try {
    // Fetch all books with their chapters and verses from VDCC translation
    const vdccVerses = await db
      .select({
        bookSlug: verses.bookSlug,
        bookName: verses.bookName,
        chapter: verses.chapter,
        verse: verses.verse,
      })
      .from(verses)
      .where(eq(verses.bibleTranslationSlug, 'vdcc'))
      .orderBy(verses.bookSlug, verses.chapter, verses.verse);

    console.log(`✅ Found ${vdccVerses.length} verses from VDCC`);

    // Group by book and calculate max chapters and verses
    const booksMap = new Map<string, BookData>();

    for (const verse of vdccVerses) {
      if (!booksMap.has(verse.bookSlug)) {
        booksMap.set(verse.bookSlug, {
          slug: verse.bookSlug,
          name: verse.bookName,
          maxChapter: 0,
          chapters: {},
        });
      }

      const book = booksMap.get(verse.bookSlug)!;

      // Update max chapter
      if (verse.chapter > book.maxChapter) {
        book.maxChapter = verse.chapter;
      }

      // Update max verse for this chapter
      if (!book.chapters[verse.chapter] || verse.verse > book.chapters[verse.chapter]) {
        book.chapters[verse.chapter] = verse.verse;
      }
    }

    // Convert map to array
    const books = Array.from(booksMap.values());

    console.log(`✅ Found ${books.length} books in VDCC translation`);

    // Create output data
    const output = {
      books,
      generatedAt: new Date().toISOString(),
    };

    // Write to JSON file in src/data directory
    const outputPath = join(__dirname, '../src/data/vdcc-books.json');
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`💾 Saved VDCC book data to: ${outputPath}`);
    console.log('✨ Done!');
  } catch (error) {
    console.error('❌ Error generating VDCC book data:', error);
    throw error;
  }
}

/**
 * Main function to generate all docs options
 */
async function main() {
  try {
    await generateTranslations();
    await generateVdccBooks();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
