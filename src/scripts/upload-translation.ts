#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { uploadBibleTranslation } from '../services/bible-parser.service.js';
import { logger } from '../utils/logger.js';
import path from 'path';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(`
Usage: npm run upload:translation -- <xml-file-path> [translation-slug] [translation-name]

Arguments:
  xml-file-path      - Path to the USFX XML file (required)
  translation-slug   - Custom slug for the translation (optional, defaults to abbreviation)
  translation-name   - Custom name for the translation (optional, defaults to XML metadata)

Examples:
  npm run upload:translation -- bibles/raw/ron-rccv.usfx.xml
  npm run upload:translation -- bibles/raw/ron-rccv.usfx.xml vdcc
  npm run upload:translation -- bibles/raw/ron-rccv.usfx.xml vdcc "Versiunea Dumitru Cornilescu Corectata"
  npm run upload:translation -- bibles/raw/en-kjv.usfx.xml kjv "King James Version"

Environment Variables Required:
  TURSO_DATABASE_URL - Your Turso database URL
  TURSO_AUTH_TOKEN - Your Turso auth token

Optional Environment Variables:
  DEBUG=true - Enable debug logging
  LOG_LEVEL=debug|verbose|trace|info|warning|error - Set log level (default: info)
  `);
  process.exit(1);
}

const xmlFilePath = path.resolve(args[0]);
const customSlug = args[1];
const customName = args[2];

async function main() {
  logger.info('='.repeat(60));
  logger.info('Bible Translation Upload Utility');
  logger.info('='.repeat(60));
  logger.info(`XML File: ${xmlFilePath}`);
  if (customSlug) {
    logger.info(`Custom Slug: ${customSlug}`);
  }
  if (customName) {
    logger.info(`Custom Name: ${customName}`);
  }
  logger.info('='.repeat(60));

  const result = await uploadBibleTranslation(xmlFilePath, customName, customSlug);

  logger.info('='.repeat(60));
  if (result.success) {
    logger.info('✓ UPLOAD SUCCESSFUL');
    logger.info(`  Translation Slug: ${result.translationSlug}`);
    logger.info(`  Translation ID: ${result.translationId}`);
    logger.info(`  Books: ${result.stats?.booksProcessed}`);
    logger.info(`  Chapters: ${result.stats?.chaptersProcessed}`);
    logger.info(`  Verses: ${result.stats?.versesUpserted}`);
    logger.info('='.repeat(60));
    process.exit(0);
  } else {
    logger.error('✗ UPLOAD FAILED');
    logger.error(`  Error: ${result.error}`);
    logger.info('='.repeat(60));
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
