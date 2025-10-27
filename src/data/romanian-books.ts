/**
 * Romanian Bible book names mapped to their English slugs
 * Used for the quote submission form
 */

export interface BibleBook {
  slug: string;
  name: string;
  chapters: number;
}

export const ROMANIAN_BIBLE_BOOKS: BibleBook[] = [
  // Old Testament
  { slug: 'genesis', name: 'Geneza', chapters: 50 },
  { slug: 'exodus', name: 'Exodul', chapters: 40 },
  { slug: 'leviticus', name: 'Leviticul', chapters: 27 },
  { slug: 'numbers', name: 'Numeri', chapters: 36 },
  { slug: 'deuteronomy', name: 'Deuteronomul', chapters: 34 },
  { slug: 'joshua', name: 'Iosua', chapters: 24 },
  { slug: 'judges', name: 'Judecători', chapters: 21 },
  { slug: 'ruth', name: 'Rut', chapters: 4 },
  { slug: '1-samuel', name: '1 Samuel', chapters: 31 },
  { slug: '2-samuel', name: '2 Samuel', chapters: 24 },
  { slug: '1-kings', name: '1 Regi', chapters: 22 },
  { slug: '2-kings', name: '2 Regi', chapters: 25 },
  { slug: '1-chronicles', name: '1 Cronici', chapters: 29 },
  { slug: '2-chronicles', name: '2 Cronici', chapters: 36 },
  { slug: 'ezra', name: 'Ezra', chapters: 10 },
  { slug: 'nehemiah', name: 'Neemia', chapters: 13 },
  { slug: 'esther', name: 'Estera', chapters: 10 },
  { slug: 'job', name: 'Iov', chapters: 42 },
  { slug: 'psalms', name: 'Psalmi', chapters: 150 },
  { slug: 'proverbs', name: 'Proverbe', chapters: 31 },
  { slug: 'ecclesiastes', name: 'Eclesiastul', chapters: 12 },
  { slug: 'song-of-solomon', name: 'Cântarea Cântărilor', chapters: 8 },
  { slug: 'isaiah', name: 'Isaia', chapters: 66 },
  { slug: 'jeremiah', name: 'Ieremia', chapters: 52 },
  { slug: 'lamentations', name: 'Plângerile lui Ieremia', chapters: 5 },
  { slug: 'ezekiel', name: 'Ezechiel', chapters: 48 },
  { slug: 'daniel', name: 'Daniel', chapters: 12 },
  { slug: 'hosea', name: 'Osea', chapters: 14 },
  { slug: 'joel', name: 'Ioel', chapters: 3 },
  { slug: 'amos', name: 'Amos', chapters: 9 },
  { slug: 'obadiah', name: 'Obadia', chapters: 1 },
  { slug: 'jonah', name: 'Iona', chapters: 4 },
  { slug: 'micah', name: 'Mica', chapters: 7 },
  { slug: 'nahum', name: 'Naum', chapters: 3 },
  { slug: 'habakkuk', name: 'Habacuc', chapters: 3 },
  { slug: 'zephaniah', name: 'Țefania', chapters: 3 },
  { slug: 'haggai', name: 'Hagai', chapters: 2 },
  { slug: 'zechariah', name: 'Zaharia', chapters: 14 },
  { slug: 'malachi', name: 'Maleahi', chapters: 4 },

  // New Testament
  { slug: 'matthew', name: 'Matei', chapters: 28 },
  { slug: 'mark', name: 'Marcu', chapters: 16 },
  { slug: 'luke', name: 'Luca', chapters: 24 },
  { slug: 'john', name: 'Ioan', chapters: 21 },
  { slug: 'acts', name: 'Faptele Apostolilor', chapters: 28 },
  { slug: 'romans', name: 'Romani', chapters: 16 },
  { slug: '1-corinthians', name: '1 Corinteni', chapters: 16 },
  { slug: '2-corinthians', name: '2 Corinteni', chapters: 13 },
  { slug: 'galatians', name: 'Galateni', chapters: 6 },
  { slug: 'ephesians', name: 'Efeseni', chapters: 6 },
  { slug: 'philippians', name: 'Filipeni', chapters: 4 },
  { slug: 'colossians', name: 'Coloseni', chapters: 4 },
  { slug: '1-thessalonians', name: '1 Tesaloniceni', chapters: 5 },
  { slug: '2-thessalonians', name: '2 Tesaloniceni', chapters: 3 },
  { slug: '1-timothy', name: '1 Timotei', chapters: 6 },
  { slug: '2-timothy', name: '2 Timotei', chapters: 4 },
  { slug: 'titus', name: 'Tit', chapters: 3 },
  { slug: 'philemon', name: 'Filimon', chapters: 1 },
  { slug: 'hebrews', name: 'Evrei', chapters: 13 },
  { slug: 'james', name: 'Iacov', chapters: 5 },
  { slug: '1-peter', name: '1 Petru', chapters: 5 },
  { slug: '2-peter', name: '2 Petru', chapters: 3 },
  { slug: '1-john', name: '1 Ioan', chapters: 5 },
  { slug: '2-john', name: '2 Ioan', chapters: 1 },
  { slug: '3-john', name: '3 Ioan', chapters: 1 },
  { slug: 'jude', name: 'Iuda', chapters: 1 },
  { slug: 'revelation', name: 'Apocalipsa', chapters: 22 },
];

// Helper function to get maximum verses for a chapter (simplified version)
// For a production app, you'd want to store exact verse counts per chapter
export function getMaxVersesForChapter(bookSlug: string, chapter: number): number {
  // This is a simplified approach - returning a reasonable max
  // In a real app, you'd have exact verse counts stored
  const book = ROMANIAN_BIBLE_BOOKS.find(b => b.slug === bookSlug);
  if (book === undefined) {return 100;}

  // Most chapters have fewer than 100 verses
  // Psalms 119 has 176 verses (the longest)
  if (bookSlug === 'psalms' && chapter === 119) {return 176;}
  if (bookSlug === 'psalms') {return 150;}

  return 100; // Default max
}
