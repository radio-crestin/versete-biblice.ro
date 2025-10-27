DROP INDEX IF EXISTS "published_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "client_ip_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "user_language_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "published_date_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "translations_slug_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "unique_translation";--> statement-breakpoint
DROP INDEX IF EXISTS "slug_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "language_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "abbreviation_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "unique_verse";--> statement-breakpoint
DROP INDEX IF EXISTS "lookup_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "translation_book_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "translation_book_chapter_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "translation_book_name_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "translation_slug_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "book_slug_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "book_name_idx";--> statement-breakpoint
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