CREATE TABLE `intelligence_accounts` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`personalization` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "intelligence_revision" CHECK("intelligence_accounts"."revision" > 0),
	CONSTRAINT "intelligence_completed" CHECK("intelligence_accounts"."completed" IN (0,1)),
	CONSTRAINT "intelligence_personalization" CHECK("intelligence_accounts"."personalization" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `intelligence_edges` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`relation` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	FOREIGN KEY (`owner_id`,`from_id`) REFERENCES `intelligence_nodes`(`owner_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`to_id`) REFERENCES `intelligence_nodes`(`owner_id`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intelligence_edge_unique` ON `intelligence_edges` (`owner_id`,`from_id`,`to_id`,`relation`);--> statement-breakpoint
CREATE TABLE `intelligence_events` (
	`owner_id` text NOT NULL,
	`node_id` text NOT NULL,
	`id` text NOT NULL,
	`document` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	FOREIGN KEY (`owner_id`,`node_id`) REFERENCES `intelligence_nodes`(`owner_id`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `intelligence_nodes` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`document` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	FOREIGN KEY (`owner_id`) REFERENCES `intelligence_accounts`(`owner_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `intelligence_versions` (
	`owner_id` text NOT NULL,
	`revision` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `revision`)
);
