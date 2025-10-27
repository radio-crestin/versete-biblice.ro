CREATE TABLE `translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text(50) NOT NULL,
	`language` text(10) NOT NULL,
	`abbreviation` text(50) NOT NULL,
	`name` text NOT NULL,
	`total_books` integer DEFAULT 0 NOT NULL,
	`total_chapters` integer DEFAULT 0 NOT NULL,
	`total_verses` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translations_slug_unique` ON `translations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_translation` ON `translations` (`language`,`abbreviation`);--> statement-breakpoint
CREATE UNIQUE INDEX `slug_idx` ON `translations` (`slug`);--> statement-breakpoint
CREATE INDEX `language_idx` ON `translations` (`language`);--> statement-breakpoint
CREATE INDEX `abbreviation_idx` ON `translations` (`abbreviation`);--> statement-breakpoint
CREATE TABLE `verses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`translation_id` integer NOT NULL,
	`translation_slug` text(50) NOT NULL,
	`book_slug` text(50) NOT NULL,
	`book_name` text(100) NOT NULL,
	`testament` text(10) NOT NULL,
	`chapter` integer NOT NULL,
	`verse` integer NOT NULL,
	`text` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`translation_id`) REFERENCES `translations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_verse` ON `verses` (`translation_slug`,`book_slug`,`chapter`,`verse`);--> statement-breakpoint
CREATE INDEX `lookup_idx` ON `verses` (`translation_slug`,`book_slug`,`chapter`,`verse`);--> statement-breakpoint
CREATE INDEX `translation_book_idx` ON `verses` (`translation_slug`,`book_slug`);--> statement-breakpoint
CREATE INDEX `translation_book_chapter_idx` ON `verses` (`translation_slug`,`book_slug`,`chapter`);--> statement-breakpoint
CREATE INDEX `translation_book_name_idx` ON `verses` (`translation_slug`,`book_name`);--> statement-breakpoint
CREATE INDEX `translation_slug_idx` ON `verses` (`translation_slug`);--> statement-breakpoint
CREATE INDEX `book_slug_idx` ON `verses` (`book_slug`);--> statement-breakpoint
CREATE INDEX `book_name_idx` ON `verses` (`book_name`);