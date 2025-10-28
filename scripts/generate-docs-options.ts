import { db, translations } from '../src/db/index.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Build-time script to fetch all translations from database and save to JSON
 * This runs before deployment to avoid database queries at module initialization
 *
 * Note: Books data generation has been moved to the admin API endpoint:
 * POST /api/v1/admin/generate-books/:slug
 * Use the admin API with system token authentication to generate books data
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
    console.log('✨ Done!');
  } catch (error) {
    console.error('❌ Error generating translations:', error);
    throw error;
  }
}

/**
 * Main function to generate all docs options
 */
async function main() {
  try {
    await generateTranslations();
    console.log('\n💡 To generate books data, use the admin API:');
    console.log('   POST /api/v1/admin/generate-books/:slug');
    console.log('   POST /api/v1/admin/generate-all-books');
    console.log('   (Requires Authorization: Bearer <SYSTEM_TOKEN>)');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
