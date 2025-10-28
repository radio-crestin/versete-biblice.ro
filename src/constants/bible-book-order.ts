/**
 * Ordered list of Bible book slugs in canonical order
 * Used to ensure consistent book ordering and provide bookIndex
 */
export const BIBLE_BOOK_ORDER = [
  // Old Testament (39 books)
  'genesis',
  'exodus',
  'leviticus',
  'numbers',
  'deuteronomy',
  'joshua',
  'judges',
  'ruth',
  '1-samuel',
  '2-samuel',
  '1-kings',
  '2-kings',
  '1-chronicles',
  '2-chronicles',
  'ezra',
  'nehemiah',
  'esther',
  'job',
  'psalms',
  'proverbs',
  'ecclesiastes',
  'song-of-solomon',
  'isaiah',
  'jeremiah',
  'lamentations',
  'ezekiel',
  'daniel',
  'hosea',
  'joel',
  'amos',
  'obadiah',
  'jonah',
  'micah',
  'nahum',
  'habakkuk',
  'zephaniah',
  'haggai',
  'zechariah',
  'malachi',
  // New Testament (27 books)
  'matthew',
  'mark',
  'luke',
  'john',
  'acts',
  'romans',
  '1-corinthians',
  '2-corinthians',
  'galatians',
  'ephesians',
  'philippians',
  'colossians',
  '1-thessalonians',
  '2-thessalonians',
  '1-timothy',
  '2-timothy',
  'titus',
  'philemon',
  'hebrews',
  'james',
  '1-peter',
  '2-peter',
  '1-john',
  '2-john',
  '3-john',
  'jude',
  'revelation',
] as const;

/**
 * Get the book index (1-based) for a given book slug
 */
export function getBookIndex(bookSlug: string): number {
  const index = BIBLE_BOOK_ORDER.indexOf(bookSlug as typeof BIBLE_BOOK_ORDER[number]);
  return index !== -1 ? index + 1 : 0;
}

/**
 * Get book slug by index (1-based)
 */
export function getBookSlugByIndex(index: number): string | undefined {
  return BIBLE_BOOK_ORDER[index - 1];
}
