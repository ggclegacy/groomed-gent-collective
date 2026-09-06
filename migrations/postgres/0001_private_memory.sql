CREATE TABLE "gentleman_memories" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"document" text NOT NULL,
	"saved_at" text NOT NULL,
	CONSTRAINT "memory_positive_revision" CHECK ("gentleman_memories"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "gentleman_memories" ADD CONSTRAINT "gentleman_memories_owner_id_members_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."members"("user_id") ON DELETE no action ON UPDATE no action;