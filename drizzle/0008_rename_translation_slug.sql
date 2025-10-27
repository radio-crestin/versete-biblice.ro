-- Rename translationSlug column to bibleTranslationSlug in verses table
-- This migration renames the column and recreates all affected indexes

-- Drop existing indexes that reference the old column name
DROP INDEX IF EXISTS `unique_verse`;
DROP INDEX IF EXISTS `lookup_idx`;
DROP INDEX IF EXISTS `translation_book_idx`;
DROP INDEX IF EXISTS `translation_book_chapter_idx`;
DROP INDEX IF EXISTS `translation_book_name_idx`;
DROP INDEX IF EXISTS `translation_slug_idx`;

-- Rename the column
ALTER TABLE `verses` RENAME COLUMN `translation_slug` TO `bible_translation_slug`;

-- Recreate indexes with the new column name
CREATE UNIQUE INDEX `unique_verse` ON `verses` (`bible_translation_slug`,`book_slug`,`chapter`,`verse`);
CREATE INDEX `lookup_idx` ON `verses` (`bible_translation_slug`,`book_slug`,`chapter`,`verse`);
CREATE INDEX `translation_book_idx` ON `verses` (`bible_translation_slug`,`book_slug`);
CREATE INDEX `translation_book_chapter_idx` ON `verses` (`bible_translation_slug`,`book_slug`,`chapter`);
CREATE INDEX `translation_book_name_idx` ON `verses` (`bible_translation_slug`,`book_name`);
CREATE INDEX `bible_translation_slug_idx` ON `verses` (`bible_translation_slug`);
