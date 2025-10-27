CREATE TABLE `daily_verse_pool` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_book` text(50) NOT NULL,
	`start_chapter` integer NOT NULL,
	`start_verse` integer NOT NULL,
	`end_book` text(50) NOT NULL,
	`end_chapter` integer NOT NULL,
	`end_verse` integer NOT NULL,
	`publish_date` text(5),
	`last_scheduled_at` text,
	`schedule_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `publish_date_idx` ON `daily_verse_pool` (`publish_date`);--> statement-breakpoint
CREATE INDEX `last_scheduled_idx` ON `daily_verse_pool` (`last_scheduled_at`);--> statement-breakpoint
CREATE INDEX `schedule_count_idx` ON `daily_verse_pool` (`schedule_count`);--> statement-breakpoint
CREATE TABLE `daily_verse_scheduled` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`verse_pool_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`verse_pool_id`) REFERENCES `daily_verse_pool`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_verse_scheduled_date_unique` ON `daily_verse_scheduled` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_date_idx` ON `daily_verse_scheduled` (`date`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `daily_verse_scheduled` (`date`);--> statement-breakpoint
CREATE INDEX `verse_pool_idx` ON `daily_verse_scheduled` (`verse_pool_id`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_ip` text NOT NULL,
	`user_name` text,
	`reference` text NOT NULL,
	`start_book` text(50) NOT NULL,
	`end_book` text(50),
	`start_chapter` integer NOT NULL,
	`end_chapter` integer,
	`start_verse` integer NOT NULL,
	`end_verse` integer,
	`user_language` text(10) NOT NULL,
	`user_note` text,
	`published` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE INDEX `client_ip_idx` ON `quotes` (`client_ip`);--> statement-breakpoint
CREATE INDEX `user_language_idx` ON `quotes` (`user_language`);--> statement-breakpoint
CREATE INDEX `published_date_idx` ON `quotes` (`published`,`published_at`);--> statement-breakpoint
CREATE INDEX `published_book_idx` ON `quotes` (`published`,`start_book`,`published_at`);--> statement-breakpoint
CREATE INDEX `published_book_chapter_idx` ON `quotes` (`published`,`start_book`,`start_chapter`,`published_at`);--> statement-breakpoint
CREATE INDEX `published_book_chapter_verse_idx` ON `quotes` (`published`,`start_book`,`start_chapter`,`start_verse`,`published_at`);--> statement-breakpoint
CREATE TABLE `translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text(50) NOT NULL,
	`language` text(10) NOT NULL,
	`abbreviation` text(50) NOT NULL,
	`name` text NOT NULL,
	`total_books` integer DEFAULT 0 NOT NULL,
	`total_chapters` integer DEFAULT 0 NOT NULL,
	`total_verses` integer DEFAULT 0 NOT NULL,
	`copyright_notice` text,
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
	`bible_translation_slug` text(50) NOT NULL,
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
CREATE UNIQUE INDEX `unique_verse` ON `verses` (`bible_translation_slug`,`book_slug`,`chapter`,`verse`);--> statement-breakpoint
CREATE INDEX `lookup_idx` ON `verses` (`bible_translation_slug`,`book_slug`,`chapter`,`verse`);--> statement-breakpoint
CREATE INDEX `translation_book_idx` ON `verses` (`bible_translation_slug`,`book_slug`);--> statement-breakpoint
CREATE INDEX `translation_book_chapter_idx` ON `verses` (`bible_translation_slug`,`book_slug`,`chapter`);--> statement-breakpoint
CREATE INDEX `translation_book_name_idx` ON `verses` (`bible_translation_slug`,`book_name`);--> statement-breakpoint
CREATE INDEX `bible_translation_slug_idx` ON `verses` (`bible_translation_slug`);--> statement-breakpoint
CREATE INDEX `book_slug_idx` ON `verses` (`book_slug`);--> statement-breakpoint
CREATE INDEX `book_name_idx` ON `verses` (`book_name`);