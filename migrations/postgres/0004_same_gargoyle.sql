CREATE TABLE "account_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "account_role" CHECK ("account_profiles"."role" IN ('member','ambassador','admin','founder'))
);
--> statement-breakpoint
CREATE TABLE "onboarding_drafts" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"document" text NOT NULL,
	"saved_at" text NOT NULL,
	CONSTRAINT "onboarding_revision" CHECK ("onboarding_drafts"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "onboarding_drafts" ADD CONSTRAINT "onboarding_drafts_owner_id_account_profiles_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."account_profiles"("user_id") ON DELETE cascade ON UPDATE no action;