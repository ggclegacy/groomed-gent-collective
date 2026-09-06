CREATE TABLE `product_learning` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`document` text NOT NULL,
	`saved_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "learning_positive_revision" CHECK("product_learning"."revision" >= 0)
);
