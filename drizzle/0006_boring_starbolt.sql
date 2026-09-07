CREATE TABLE `account_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`document` text NOT NULL,
	`saved_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `account_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "settings_revision" CHECK("account_settings"."revision" >= 0)
);
