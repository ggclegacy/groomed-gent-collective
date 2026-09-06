CREATE TABLE "product_learning" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"document" text NOT NULL,
	"saved_at" text NOT NULL,
	CONSTRAINT "learning_positive_revision" CHECK ("product_learning"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_learning" ADD CONSTRAINT "product_learning_owner_id_members_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."members"("user_id") ON DELETE no action ON UPDATE no action;