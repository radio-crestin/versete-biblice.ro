DROP INDEX `translation_slug_quotes_idx`;--> statement-breakpoint
DROP INDEX `translation_published_idx`;--> statement-breakpoint
DROP INDEX `translation_book_idx`;--> statement-breakpoint
DROP INDEX `translation_book_chapter_idx`;--> statement-breakpoint
DROP INDEX `translation_book_chapter_verse_idx`;--> statement-breakpoint
CREATE INDEX `published_book_idx` ON `quotes` (`published`,`start_book`,`published_at`);--> statement-breakpoint
CREATE INDEX `published_book_chapter_idx` ON `quotes` (`published`,`start_book`,`start_chapter`,`published_at`);--> statement-breakpoint
CREATE INDEX `published_book_chapter_verse_idx` ON `quotes` (`published`,`start_book`,`start_chapter`,`start_verse`,`published_at`);--> statement-breakpoint
ALTER TABLE `quotes` DROP COLUMN `translation_slug`;