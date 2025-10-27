import { BOOK_NAMES } from './book-names.js';

/**
 * Convert text to URL-friendly slug
 * Examples:
 *   "Genesis" -> "genesis"
 *   "1 Samuel" -> "1-samuel"
 *   "Song of Solomon" -> "song-of-solomon"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
}

/**
 * Generate a translation slug from abbreviation
 * Simply lowercase the abbreviation
 */
export function getTranslationSlug(abbreviation: string): string {
  return abbreviation.toLowerCase().trim();
}

/**
 * Generate an English book slug from book ID
 * Always returns the English slug regardless of the source translation language
 * Examples:
 *   "GEN" -> "genesis"
 *   "1SA" -> "1-samuel"
 *   "MAT" -> "matthew"
 *   "PSA" -> "psalms"
 */
export function getBookSlug(bookId: string): string {
  const englishName = BOOK_NAMES[bookId];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (englishName === undefined) {
    throw new Error(`Unknown book ID: ${bookId}`);
  }
  return slugify(englishName);
}
