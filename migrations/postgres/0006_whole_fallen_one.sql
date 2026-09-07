CREATE TABLE "account_settings" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"document" text NOT NULL,
	"saved_at" text NOT NULL,
	CONSTRAINT "settings_revision" CHECK ("account_settings"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "account_settings" ADD CONSTRAINT "account_settings_owner_id_account_profiles_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."account_profiles"("user_id") ON DELETE cascade ON UPDATE no action;