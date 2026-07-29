CREATE TABLE `greetings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_token_hash` text NOT NULL,
	`public_slug` text NOT NULL,
	`recipient_name` text NOT NULL,
	`sender_name` text NOT NULL,
	`template` text NOT NULL,
	`headline` text NOT NULL,
	`message` text NOT NULL,
	`surprise_message` text NOT NULL,
	`music_url` text NOT NULL,
	`music_name` text NOT NULL,
	`photos_json` text NOT NULL,
	`birthday_date` text NOT NULL,
	`opened_at` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `greetings_owner_token_hash_unique` ON `greetings` (`owner_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `greetings_public_slug_unique` ON `greetings` (`public_slug`);--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`greeting_id` text NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`greeting_id`) REFERENCES `greetings`(`id`) ON UPDATE no action ON DELETE cascade
);
