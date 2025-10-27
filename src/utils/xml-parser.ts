import fs from 'fs';
import path from 'path';

export interface ParsedVerse {
  id: number;
  text: string;
}

export interface ParsedChapter {
  chapter: number;
  verses: Record<string, ParsedVerse>;
}

export interface ParsedBook {
  bookId: string;
  bookTitle: string;
  englishName: string;
  chapters: ParsedChapter[];
}

export interface TranslationMetadata {
  language: string;
  abbreviation: string;
  name: string;
}

/**
 * Clean text by removing extra whitespace and formatting
 */
export function cleanText(text: string): string {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Extract verses from chapter content using regex
 */
export function extractVerses(content: string): Record<string, ParsedVerse> {
  const verses: Record<string, ParsedVerse> = {};

  // Match verse pattern: <v id="X" />text...
  const versePattern = /<v\s+id="(\d+)"\s*\/>([\s\S]*?)(?=<v\s+id="|<c\s+id="|$)/g;

  let match;
  while ((match = versePattern.exec(content)) !== null) {
    const verseId = match[1];
    let verseText = match[2];

    // Remove XML tags but keep the text
    verseText = verseText.replace(/<[^>]+>/g, '');
    verseText = cleanText(verseText);

    if (verseText) {
      verses[verseId] = {
        id: parseInt(verseId),
        text: verseText,
      };
    }
  }

  return verses;
}

/**
 * Extract metadata from XML filename
 * Expected format: {lang}-{abbr}.usfx.xml (e.g., ron-rccv.usfx.xml)
 */
export function extractMetadataFromFilename(xmlFilePath: string): { language: string; abbreviation: string } {
  const filename = path.basename(xmlFilePath);
  const match = filename.match(/^([a-z]{3})-([a-z0-9]+)\.usfx\.xml$/i);

  if (match) {
    return {
      language: match[1],
      abbreviation: match[2],
    };
  }

  // Fallback if pattern doesn't match
  return {
    language: 'unknown',
    abbreviation: filename.replace('.usfx.xml', ''),
  };
}

/**
 * Extract translation name from XML content
 */
export function extractTranslationName(xmlContent: string): string | null {
  // Try to find translation name in XML (look for common patterns)
  const nameMatch = xmlContent.match(/<id\s+type="name">([^<]+)<\/id>/);
  if (nameMatch) {
    return nameMatch[1].trim();
  }
  return null;
}

/**
 * Parse Bible XML content and extract structured data
 */
export function parseBibleXML(xmlContent: string, bookNamesMap: Record<string, string>): ParsedBook[] {
  const books: ParsedBook[] = [];

  // Extract book sections using regex
  const bookPattern = /<book\s+id="([^"]+)">([\s\S]*?)<\/book>/g;
  let bookMatch;

  while ((bookMatch = bookPattern.exec(xmlContent)) !== null) {
    const bookId = bookMatch[1];
    const bookContent = bookMatch[2];

    // Extract book title
    const titleMatch = bookContent.match(/<h>([^<]+)<\/h>/);
    const bookTitle = titleMatch ? titleMatch[1].trim() : bookNamesMap[bookId] || bookId;
    const englishName = bookNamesMap[bookId] || bookId;

    const chapters: ParsedChapter[] = [];

    // Group content by chapters
    const chapterPattern = /<c\s+id="(\d+)"\s*\/>([\s\S]*?)(?=<c\s+id="|$)/g;
    let chapterMatch;

    while ((chapterMatch = chapterPattern.exec(bookContent)) !== null) {
      const chapterNum = parseInt(chapterMatch[1]);
      const chapterContent = chapterMatch[2];

      const verses = extractVerses(chapterContent);
      const verseCount = Object.keys(verses).length;

      if (verseCount > 0) {
        chapters.push({
          chapter: chapterNum,
          verses,
        });
      }
    }

    if (chapters.length > 0) {
      books.push({
        bookId,
        bookTitle,
        englishName,
        chapters,
      });
    }
  }

  return books;
}

/**
 * Read and parse XML file
 */
export function readXMLFile(xmlFilePath: string): string {
  if (!fs.existsSync(xmlFilePath)) {
    throw new Error(`File not found: ${xmlFilePath}`);
  }
  return fs.readFileSync(xmlFilePath, 'utf-8');
}
