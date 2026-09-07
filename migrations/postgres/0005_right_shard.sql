INSERT INTO account_profiles (user_id,email,name,role,created_at,updated_at) SELECT user_id,email,name,'ambassador',joined_at,joined_at FROM members WHERE true ON CONFLICT(user_id) DO NOTHING;
--> statement-breakpoint
ALTER TABLE "gentleman_memories" DROP CONSTRAINT "gentleman_memories_owner_id_members_user_id_fk";
--> statement-breakpoint
ALTER TABLE "gentleman_memories" ADD CONSTRAINT "gentleman_memories_owner_id_account_profiles_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."account_profiles"("user_id") ON DELETE no action ON UPDATE no action;