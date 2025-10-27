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
	`user_note` text NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE INDEX `published_idx` ON `quotes` (`published`,`published_at`);--> statement-breakpoint
CREATE INDEX `client_ip_idx` ON `quotes` (`client_ip`);--> statement-breakpoint
CREATE INDEX `user_language_idx` ON `quotes` (`user_language`);--> statement-breakpoint
CREATE INDEX `published_date_idx` ON `quotes` (`published`,`published_at`);