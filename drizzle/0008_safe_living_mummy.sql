ALTER TABLE `verses` RENAME COLUMN "translation_slug" TO "bible_translation_slug";--> statement-breakpoint
DROP INDEX `translation_slug_idx`;--> statement-breakpoint
DROP INDEX `unique_verse`;--> statement-breakpoint
DROP INDEX `lookup_idx`;--> statement-breakpoint
DROP INDEX `translation_book_idx`;--> statement-breakpoint
DROP INDEX `translation_book_chapter_idx`;--> statement-breakpoint
DROP INDEX `translation_book_name_idx`;--> statement-breakpoint
CREATE INDEX `bible_translation_slug_idx` ON `verses` (`bible_translation_slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_verse` ON `verses` (`bible_translation_slug`,`book_slug`,`chapter`,`verse`);--> statement-breakpoint
CREATE INDEX `lookup_idx` ON `verses` (`bible_translation_slug`,`book_slug`,`chapter`,`verse`);--> statement-breakpoint
CREATE INDEX `translation_book_idx` ON `verses` (`bible_translation_slug`,`book_slug`);--> statement-breakpoint
CREATE INDEX `translation_book_chapter_idx` ON `verses` (`bible_translation_slug`,`book_slug`,`chapter`);--> statement-breakpoint
CREATE INDEX `translation_book_name_idx` ON `verses` (`bible_translation_slug`,`book_name`);