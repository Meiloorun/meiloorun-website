CREATE TABLE "comic_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"year" text,
	"chapter" text NOT NULL,
	"chapter_title" text NOT NULL,
	"chapter_order" integer NOT NULL,
	"position" integer NOT NULL,
	"source_url" text NOT NULL,
	"reader_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX "comic_issues_order_idx" ON "comic_issues" USING btree ("active","chapter_order","position");