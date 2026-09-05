CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`track` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	`redeemed_by` text,
	`redeemed_at` text,
	`revoked_at` text,
	CONSTRAINT "invitation_track" CHECK("invitations"."track" IN ('ambassador','barber'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_token_unique` ON `invitations` (`token_hash`);--> statement-breakpoint
CREATE TABLE `draft_libraries` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`document` text NOT NULL,
	`saved_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "positive_revision" CHECK("draft_libraries"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`track` text NOT NULL,
	`status` text NOT NULL,
	`wholesale_status` text NOT NULL,
	`joined_at` text NOT NULL,
	`invitation_id` text NOT NULL,
	FOREIGN KEY (`invitation_id`) REFERENCES `invitations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "member_track" CHECK("members"."track" IN ('ambassador','barber')),
	CONSTRAINT "member_status" CHECK("members"."status" IN ('active','suspended')),
	CONSTRAINT "wholesale_status" CHECK("members"."wholesale_status" IN ('not_reviewed','eligible','approved'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `member_invitation_unique` ON `members` (`invitation_id`);