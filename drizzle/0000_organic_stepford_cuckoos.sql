CREATE TYPE "public"."block_kind" AS ENUM('text', 'richtext', 'list');--> statement-breakpoint
CREATE TYPE "public"."dua_category" AS ENUM('dua', 'ziyara', 'taqib');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('fa', 'de');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TYPE "public"."submission_kind" AS ENUM('contact', 'membership', 'donation', 'volunteer');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('new', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('light', 'dark');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(64) NOT NULL,
	"entity" varchar(96) NOT NULL,
	"entity_id" text DEFAULT '' NOT NULL,
	"diff" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "block_translations" (
	"block_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "block_translations_block_id_locale_pk" PRIMARY KEY("block_id","locale")
);
--> statement-breakpoint
CREATE TABLE "community_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_translations" (
	"card_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	CONSTRAINT "community_translations_card_id_locale_pk" PRIMARY KEY("card_id","locale")
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_key" varchar(64) NOT NULL,
	"block_key" varchar(96) NOT NULL,
	"kind" "block_kind" DEFAULT 'text' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_translations" (
	"course_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"target_group" text DEFAULT '' NOT NULL,
	"schedule" text DEFAULT '' NOT NULL,
	"languages" text DEFAULT '' NOT NULL,
	CONSTRAINT "course_translations_course_id_locale_pk" PRIMARY KEY("course_id","locale")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"category" varchar(64) DEFAULT 'language' NOT NULL,
	"level" varchar(64) DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "culture_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "culture_translations" (
	"card_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	CONSTRAINT "culture_translations_card_id_locale_pk" PRIMARY KEY("card_id","locale")
);
--> statement-breakpoint
CREATE TABLE "dua_translations" (
	"dua_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"when_to_read" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"translation" text,
	CONSTRAINT "dua_translations_dua_id_locale_pk" PRIMARY KEY("dua_id","locale")
);
--> statement-breakpoint
CREATE TABLE "duas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"category" "dua_category" DEFAULT 'dua' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"arabic_title" text DEFAULT '' NOT NULL,
	"arabic_text" text,
	"transliteration" text,
	CONSTRAINT "duas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_translations" (
	"event_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	CONSTRAINT "event_translations_event_id_locale_pk" PRIMARY KEY("event_id","locale")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"category" varchar(64) DEFAULT 'general' NOT NULL,
	"image_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"category" varchar(64) DEFAULT 'general' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"key" text NOT NULL,
	"width" integer DEFAULT 0 NOT NULL,
	"height" integer DEFAULT 0 NOT NULL,
	"mime" varchar(128) NOT NULL,
	"blur_data_url" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_translations" (
	"media_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	CONSTRAINT "media_translations_media_id_locale_pk" PRIMARY KEY("media_id","locale")
);
--> statement-breakpoint
CREATE TABLE "membership_translations" (
	"membership_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"price_label" text DEFAULT '' NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "membership_translations_membership_id_locale_pk" PRIMARY KEY("membership_id","locale")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_key" varchar(64) NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "memberships_tier_key_unique" UNIQUE("tier_key")
);
--> statement-breakpoint
CREATE TABLE "occasion_translations" (
	"occasion_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "occasion_translations_occasion_id_locale_pk" PRIMARY KEY("occasion_id","locale")
);
--> statement-breakpoint
CREATE TABLE "occasions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hijri_month" smallint NOT NULL,
	"hijri_day" smallint NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_translations" (
	"offer_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	CONSTRAINT "offer_translations_offer_id_locale_pk" PRIMARY KEY("offer_id","locale")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"icon" varchar(64) DEFAULT 'Sparkle' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_translations" (
	"page_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"kicker" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"lead" text DEFAULT '' NOT NULL,
	CONSTRAINT "page_translations_page_id_locale_pk" PRIMARY KEY("page_id","locale")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	CONSTRAINT "pages_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "programme_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_translations" (
	"item_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"time_label" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	CONSTRAINT "programme_translations_item_id_locale_pk" PRIMARY KEY("item_id","locale")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"default_locale" "locale" DEFAULT 'fa' NOT NULL,
	"default_theme" "theme" DEFAULT 'light' NOT NULL,
	"show_opening_event" boolean DEFAULT true NOT NULL,
	"contact_email" varchar(255) DEFAULT '' NOT NULL,
	"phone" varchar(64) DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"iban" varchar(64) DEFAULT '' NOT NULL,
	"map_url" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "sport_translations" (
	"sport_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"activity" text DEFAULT '' NOT NULL,
	"audience" text DEFAULT '' NOT NULL,
	"schedule" text DEFAULT '' NOT NULL,
	CONSTRAINT "sport_translations_sport_id_locale_pk" PRIMARY KEY("sport_id","locale")
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "submission_kind" NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(64) DEFAULT '' NOT NULL,
	"topic" varchar(120) DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"locale" "locale" DEFAULT 'fa' NOT NULL,
	"ip_hash" varchar(64) DEFAULT '' NOT NULL,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(160) NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "values_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "values_translations" (
	"item_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	CONSTRAINT "values_translations_item_id_locale_pk" PRIMARY KEY("item_id","locale")
);
--> statement-breakpoint
CREATE TABLE "week_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekday" smallint DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "week_translations" (
	"row_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	CONSTRAINT "week_translations_row_id_locale_pk" PRIMARY KEY("row_id","locale")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_translations" ADD CONSTRAINT "block_translations_block_id_content_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."content_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_translations" ADD CONSTRAINT "community_translations_card_id_community_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."community_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_translations" ADD CONSTRAINT "course_translations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "culture_translations" ADD CONSTRAINT "culture_translations_card_id_culture_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."culture_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dua_translations" ADD CONSTRAINT "dua_translations_dua_id_duas_id_fk" FOREIGN KEY ("dua_id") REFERENCES "public"."duas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_translations" ADD CONSTRAINT "event_translations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_translations" ADD CONSTRAINT "media_translations_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_translations" ADD CONSTRAINT "membership_translations_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occasion_translations" ADD CONSTRAINT "occasion_translations_occasion_id_occasions_id_fk" FOREIGN KEY ("occasion_id") REFERENCES "public"."occasions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_translations" ADD CONSTRAINT "offer_translations_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_items" ADD CONSTRAINT "programme_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_translations" ADD CONSTRAINT "programme_translations_item_id_programme_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."programme_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sport_translations" ADD CONSTRAINT "sport_translations_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "values_translations" ADD CONSTRAINT "values_translations_item_id_values_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."values_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_translations" ADD CONSTRAINT "week_translations_row_id_week_schedule_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."week_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "community_published_sort_idx" ON "community_cards" USING btree ("published","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "content_blocks_page_block_uq" ON "content_blocks" USING btree ("page_key","block_key");--> statement-breakpoint
CREATE INDEX "content_blocks_page_sort_idx" ON "content_blocks" USING btree ("page_key","sort");--> statement-breakpoint
CREATE INDEX "courses_published_sort_idx" ON "courses" USING btree ("published","sort");--> statement-breakpoint
CREATE INDEX "courses_category_idx" ON "courses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "culture_published_sort_idx" ON "culture_cards" USING btree ("published","sort");--> statement-breakpoint
CREATE INDEX "duas_published_sort_idx" ON "duas" USING btree ("published","sort");--> statement-breakpoint
CREATE INDEX "duas_category_idx" ON "duas" USING btree ("category");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_published_starts_idx" ON "events" USING btree ("published","starts_at");--> statement-breakpoint
CREATE INDEX "events_featured_idx" ON "events" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "gallery_published_sort_idx" ON "gallery_items" USING btree ("published","sort");--> statement-breakpoint
CREATE INDEX "gallery_category_idx" ON "gallery_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "media_created_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "memberships_sort_idx" ON "memberships" USING btree ("sort");--> statement-breakpoint
CREATE INDEX "occasions_hijri_idx" ON "occasions" USING btree ("hijri_month","hijri_day");--> statement-breakpoint
CREATE INDEX "offers_published_sort_idx" ON "offers" USING btree ("published","sort");--> statement-breakpoint
CREATE INDEX "pages_published_sort_idx" ON "pages" USING btree ("published","sort");--> statement-breakpoint
CREATE INDEX "programme_event_sort_idx" ON "programme_items" USING btree ("event_id","sort");--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sports_published_sort_idx" ON "sports" USING btree ("published","sort");--> statement-breakpoint
CREATE INDEX "submissions_status_created_idx" ON "submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "submissions_kind_idx" ON "submissions" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "values_sort_idx" ON "values_items" USING btree ("sort");--> statement-breakpoint
CREATE INDEX "week_schedule_sort_idx" ON "week_schedule" USING btree ("weekday","sort");