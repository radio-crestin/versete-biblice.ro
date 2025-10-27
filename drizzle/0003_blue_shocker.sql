DROP INDEX "published_idx";--> statement-breakpoint
DROP INDEX "client_ip_idx";--> statement-breakpoint
DROP INDEX "user_language_idx";--> statement-breakpoint
DROP INDEX "published_date_idx";--> statement-breakpoint
DROP INDEX "translations_slug_unique";--> statement-breakpoint
DROP INDEX "unique_translation";--> statement-breakpoint
DROP INDEX "slug_idx";--> statement-breakpoint
DROP INDEX "language_idx";--> statement-breakpoint
DROP INDEX "abbreviation_idx";--> statement-breakpoint
DROP INDEX "unique_verse";--> statement-breakpoint
DROP INDEX "lookup_idx";--> statement-breakpoint
DROP INDEX "translation_book_idx";--> statement-breakpoint
DROP INDEX "translation_book_chapter_idx";--> statement-breakpoint
DROP INDEX "translation_book_name_idx";--> statement-breakpoint
DROP INDEX "translation_slug_idx";--> statement-breakpoint
DROP INDEX "book_slug_idx";--> statement-breakpoint
DROP INDEX "book_name_idx";--> statement-breakpoint
ALTER TABLE `quotes` ALTER COLUMN "user_note" TO "user_note" text;--> statement-breakpoint
CREATE INDEX `published_idx` ON `quotes` (`published`,`published_at`);--> statement-breakpoint
CREATE INDEX `client_ip_idx` ON `quotes` (`client_ip`);--> statement-breakpoint
CREATE INDEX `user_language_idx` ON `quotes` (`user_language`);--> statement-breakpoint
CREATE INDEX `published_date_idx` ON `quotes` (`published`,`published_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `translations_slug_unique` ON `translations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_translation` ON `translations` (`language`,`abbreviation`);--> statement-breakpoint
CREATE UNIQUE INDEX `slug_idx` ON `translations` (`slug`);--> statement-breakpoint
CREATE INDEX `language_idx` ON `translations` (`language`);--> statement-breakpoint
CREATE INDEX `abbreviation_idx` ON `translations` (`abbreviation`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_verse` ON `verses` (`translation_slug`,`book_slug`,`chapter`,`verse`);--> statement-breakpoint
CREATE INDEX `lookup_idx` ON `verses` (`translation_slug`,`book_slug`,`chapter`,`verse`);--> statement-breakpoint
CREATE INDEX `translation_book_idx` ON `verses` (`translation_slug`,`book_slug`);--> statement-breakpoint
CREATE INDEX `translation_book_chapter_idx` ON `verses` (`translation_slug`,`book_slug`,`chapter`);--> statement-breakpoint
CREATE INDEX `translation_book_name_idx` ON `verses` (`translation_slug`,`book_name`);--> statement-breakpoint
CREATE INDEX `translation_slug_idx` ON `verses` (`translation_slug`);--> statement-breakpoint
CREATE INDEX `book_slug_idx` ON `verses` (`book_slug`);--> statement-breakpoint
CREATE INDEX `book_name_idx` ON `verses` (`book_name`);