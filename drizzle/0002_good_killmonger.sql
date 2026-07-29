CREATE TABLE `access_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`code` text NOT NULL,
	`status` text NOT NULL,
	`issued_at` text NOT NULL,
	`expires_at` text,
	`used_at` text,
	`greeting_id` text,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_codes_payment_id_unique` ON `access_codes` (`payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `access_codes_code_unique` ON `access_codes` (`code`);--> statement-breakpoint
CREATE INDEX `access_codes_status_idx` ON `access_codes` (`status`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`content_json` text NOT NULL,
	`owner_email` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `greeting_private` (
	`greeting_id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`owner_token_hash` text NOT NULL,
	`payment_id` text NOT NULL,
	`internal_notes` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`greeting_id`) REFERENCES `greetings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `greeting_private_owner_token_unique` ON `greeting_private` (`owner_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `greeting_private_payment_unique` ON `greeting_private` (`payment_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`email` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE INDEX `notifications_status_idx` ON `notifications` (`status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_invoice_id` text,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`client_secret_hash` text NOT NULL,
	`qr_text` text NOT NULL,
	`qr_image` text NOT NULL,
	`short_url` text NOT NULL,
	`deeplinks_json` text NOT NULL,
	`failure_reason` text NOT NULL,
	`expires_at` text NOT NULL,
	`succeeded_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_order_id_unique` ON `payments` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_provider_invoice_id_unique` ON `payments` (`provider_invoice_id`);--> statement-breakpoint
CREATE INDEX `payments_draft_id_idx` ON `payments` (`draft_id`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`event_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_events_provider_event_unique` ON `webhook_events` (`provider`,`event_id`);--> statement-breakpoint
ALTER TABLE `greetings` ADD `access_code_id` text;