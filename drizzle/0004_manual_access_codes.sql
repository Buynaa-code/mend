ALTER TABLE `access_codes` ADD COLUMN `source` text DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE `access_codes` ADD COLUMN `label` text;--> statement-breakpoint
ALTER TABLE `access_codes` ADD COLUMN `created_by` text;--> statement-breakpoint
CREATE INDEX `access_codes_source_idx` ON `access_codes` (`source`);
