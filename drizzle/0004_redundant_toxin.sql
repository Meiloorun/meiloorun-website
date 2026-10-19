CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"main_game_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 'main'),
	CONSTRAINT "site_settings_positive_game_id" CHECK ("site_settings"."main_game_id" > 0)
);
