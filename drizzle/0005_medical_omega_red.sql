INSERT INTO account_profiles (user_id,email,name,role,created_at,updated_at) SELECT user_id,email,name,'ambassador',joined_at,joined_at FROM members WHERE true ON CONFLICT(user_id) DO NOTHING;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_gentleman_memories` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`document` text NOT NULL,
	`saved_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `account_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "memory_positive_revision" CHECK("__new_gentleman_memories"."revision" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_gentleman_memories`("owner_id", "revision", "document", "saved_at") SELECT "owner_id", "revision", "document", "saved_at" FROM `gentleman_memories`;--> statement-breakpoint
DROP TABLE `gentleman_memories`;--> statement-breakpoint
ALTER TABLE `__new_gentleman_memories` RENAME TO `gentleman_memories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;