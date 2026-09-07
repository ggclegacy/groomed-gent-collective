CREATE TABLE "intelligence_accounts" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"revision" integer NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"personalization" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "intelligence_revision" CHECK ("intelligence_accounts"."revision" > 0),
	CONSTRAINT "intelligence_completed" CHECK ("intelligence_accounts"."completed" IN (0,1)),
	CONSTRAINT "intelligence_personalization" CHECK ("intelligence_accounts"."personalization" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE "intelligence_edges" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"relation" text NOT NULL,
	CONSTRAINT "intelligence_edges_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "intelligence_events" (
	"owner_id" text NOT NULL,
	"node_id" text NOT NULL,
	"id" text NOT NULL,
	"document" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "intelligence_events_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "intelligence_nodes" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"document" text NOT NULL,
	CONSTRAINT "intelligence_nodes_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "intelligence_versions" (
	"owner_id" text NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "intelligence_versions_owner_id_revision_pk" PRIMARY KEY("owner_id","revision")
);
--> statement-breakpoint
ALTER TABLE "intelligence_edges" ADD CONSTRAINT "intelligence_edges_owner_id_from_id_intelligence_nodes_owner_id_id_fk" FOREIGN KEY ("owner_id","from_id") REFERENCES "public"."intelligence_nodes"("owner_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_edges" ADD CONSTRAINT "intelligence_edges_owner_id_to_id_intelligence_nodes_owner_id_id_fk" FOREIGN KEY ("owner_id","to_id") REFERENCES "public"."intelligence_nodes"("owner_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_events" ADD CONSTRAINT "intelligence_events_owner_id_node_id_intelligence_nodes_owner_id_id_fk" FOREIGN KEY ("owner_id","node_id") REFERENCES "public"."intelligence_nodes"("owner_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_nodes" ADD CONSTRAINT "intelligence_nodes_owner_id_intelligence_accounts_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."intelligence_accounts"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "intelligence_edge_unique" ON "intelligence_edges" USING btree ("owner_id","from_id","to_id","relation");