ALTER TABLE "course_translations" ADD COLUMN "fee" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "days" varchar(16) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "start_time" varchar(5) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "end_time" varchar(5) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "rhythm" varchar(16) DEFAULT 'weekly' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "audience_group" varchar(16) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "href" varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "days" varchar(16) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "start_time" varchar(5) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "end_time" varchar(5) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "rhythm" varchar(16) DEFAULT 'weekly' NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "audience_group" varchar(16) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "week_schedule" ADD COLUMN "start_time" varchar(5) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "week_schedule" ADD COLUMN "end_time" varchar(5) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "week_schedule" ADD COLUMN "audience_group" varchar(16) DEFAULT 'all' NOT NULL;--> statement-breakpoint
UPDATE "courses" SET "days" = '1,3', "start_time" = '17:00', "end_time" = '18:30', "rhythm" = 'weekly', "audience_group" = 'adults' WHERE "slug" = 'deutsch-a1';--> statement-breakpoint
UPDATE "courses" SET "days" = '2', "start_time" = '18:00', "end_time" = '20:00', "rhythm" = 'weekly', "audience_group" = 'adults' WHERE "slug" = 'deutsch-b1';--> statement-breakpoint
UPDATE "courses" SET "days" = '6', "start_time" = '10:30', "end_time" = '12:00', "rhythm" = 'weekly', "audience_group" = 'kids' WHERE "slug" = 'farsi-kinder';--> statement-breakpoint
UPDATE "courses" SET "days" = '4', "start_time" = '16:00', "end_time" = '18:00', "rhythm" = 'weekly', "audience_group" = 'kids' WHERE "slug" = 'nachhilfe';--> statement-breakpoint
UPDATE "courses" SET "days" = '7', "start_time" = '11:00', "end_time" = '12:30', "rhythm" = 'weekly', "audience_group" = 'all' WHERE "slug" = 'quran-tajwid';--> statement-breakpoint
UPDATE "courses" SET "days" = '5', "start_time" = '17:00', "end_time" = '', "rhythm" = 'biweekly', "audience_group" = 'all' WHERE "slug" = 'kalligrafie';--> statement-breakpoint
UPDATE "courses" SET "days" = '3', "start_time" = '18:00', "end_time" = '', "rhythm" = 'monthly', "audience_group" = 'adults' WHERE "slug" = 'integration-werkstatt';--> statement-breakpoint
UPDATE "sports" SET "days" = '1', "start_time" = '19:00', "end_time" = '21:00', "audience_group" = 'women' WHERE "id" IN (SELECT "sport_id" FROM "sport_translations" WHERE "locale" = 'de' AND "activity" = 'Volleyball (Frauen)');--> statement-breakpoint
UPDATE "sports" SET "days" = '3', "start_time" = '19:00', "end_time" = '21:00', "audience_group" = 'men' WHERE "id" IN (SELECT "sport_id" FROM "sport_translations" WHERE "locale" = 'de' AND "activity" = 'Volleyball (Männer)');--> statement-breakpoint
UPDATE "sports" SET "days" = '5', "start_time" = '16:00', "end_time" = '17:30', "audience_group" = 'youth' WHERE "id" IN (SELECT "sport_id" FROM "sport_translations" WHERE "locale" = 'de' AND "activity" = 'Futsal Jugend');--> statement-breakpoint
UPDATE "sports" SET "days" = '2', "start_time" = '10:00', "end_time" = '11:00', "audience_group" = 'all' WHERE "id" IN (SELECT "sport_id" FROM "sport_translations" WHERE "locale" = 'de' AND "activity" = 'Leichte Gymnastik');--> statement-breakpoint
UPDATE "sports" SET "days" = '7', "start_time" = '15:00', "end_time" = '17:00', "audience_group" = 'family' WHERE "id" IN (SELECT "sport_id" FROM "sport_translations" WHERE "locale" = 'de' AND "activity" = 'Familiensportstunde');--> statement-breakpoint
DELETE FROM "week_schedule" WHERE "id" IN (SELECT "row_id" FROM "week_translations" WHERE "locale" = 'de' AND "label" IN ('Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'));--> statement-breakpoint
WITH "row" AS (INSERT INTO "week_schedule" ("weekday", "start_time", "audience_group", "sort") SELECT 4, '20:30', 'all', 0 WHERE EXISTS (SELECT 1 FROM "site_settings") AND NOT EXISTS (SELECT 1 FROM "week_translations" WHERE "locale" = 'de' AND "label" = 'Duʿa Kumail') RETURNING "id") INSERT INTO "week_translations" ("row_id", "locale", "label", "detail") SELECT "id", 'fa'::"locale", 'دعای کمیل', '' FROM "row" UNION ALL SELECT "id", 'de'::"locale", 'Duʿa Kumail', '' FROM "row";--> statement-breakpoint
WITH "row" AS (INSERT INTO "week_schedule" ("weekday", "start_time", "audience_group", "sort") SELECT 5, '', 'all', 1 WHERE EXISTS (SELECT 1 FROM "site_settings") AND NOT EXISTS (SELECT 1 FROM "week_translations" WHERE "locale" = 'de' AND "label" = 'Freitagsgebet') RETURNING "id") INSERT INTO "week_translations" ("row_id", "locale", "label", "detail") SELECT "id", 'fa'::"locale", 'نماز جمعه', 'هنگام اذان ظهر' FROM "row" UNION ALL SELECT "id", 'de'::"locale", 'Freitagsgebet', 'zur Mittagsgebetszeit' FROM "row";--> statement-breakpoint
WITH "row" AS (INSERT INTO "week_schedule" ("weekday", "start_time", "audience_group", "sort") SELECT 6, '', 'kids', 2 WHERE EXISTS (SELECT 1 FROM "site_settings") AND NOT EXISTS (SELECT 1 FROM "week_translations" WHERE "locale" = 'de' AND "label" = 'Nachmittagsprogramm für Kinder') RETURNING "id") INSERT INTO "week_translations" ("row_id", "locale", "label", "detail") SELECT "id", 'fa'::"locale", 'برنامهٔ بعدازظهر کودکان', 'بعدازظهر' FROM "row" UNION ALL SELECT "id", 'de'::"locale", 'Nachmittagsprogramm für Kinder', 'nachmittags' FROM "row";--> statement-breakpoint
UPDATE "offers" SET "href" = '/courses' WHERE "icon" = 'BookOpen' AND "href" = '';--> statement-breakpoint
UPDATE "offers" SET "href" = '/duas' WHERE "icon" = 'HandsPraying' AND "href" = '';--> statement-breakpoint
UPDATE "offers" SET "href" = '/sport' WHERE "icon" = 'Volleyball' AND "href" = '';--> statement-breakpoint
UPDATE "offers" SET "href" = '/culture' WHERE "icon" = 'MaskHappy' AND "href" = '';--> statement-breakpoint
UPDATE "offers" SET "href" = '/community' WHERE "icon" = 'Handshake' AND "href" = '';--> statement-breakpoint
UPDATE "offers" SET "href" = '/courses' WHERE "icon" = 'UsersThree' AND "href" = '';--> statement-breakpoint
UPDATE "events" SET "starts_at" = ("starts_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna', "ends_at" = ("ends_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna' WHERE "slug" = 'eroeffnungsfest' AND extract(hour from "starts_at" AT TIME ZONE 'UTC') = 16 AND extract(minute from "starts_at" AT TIME ZONE 'UTC') = 0;--> statement-breakpoint
UPDATE "events" SET "starts_at" = ("starts_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna', "ends_at" = ("ends_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna' WHERE "slug" = 'lyrikabend' AND extract(hour from "starts_at" AT TIME ZONE 'UTC') = 19 AND extract(minute from "starts_at" AT TIME ZONE 'UTC') = 0;--> statement-breakpoint
UPDATE "events" SET "starts_at" = ("starts_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna', "ends_at" = ("ends_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna' WHERE "slug" = 'nachbarschaftsfruehstueck' AND extract(hour from "starts_at" AT TIME ZONE 'UTC') = 10 AND extract(minute from "starts_at" AT TIME ZONE 'UTC') = 0;--> statement-breakpoint
UPDATE "events" SET "starts_at" = ("starts_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna', "ends_at" = ("ends_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna' WHERE "slug" = 'infoabend-kurse' AND extract(hour from "starts_at" AT TIME ZONE 'UTC') = 18 AND extract(minute from "starts_at" AT TIME ZONE 'UTC') = 0;--> statement-breakpoint
UPDATE "events" SET "starts_at" = ("starts_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna', "ends_at" = ("ends_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Vienna' WHERE "slug" = 'filmabend-iranisches-kino' AND extract(hour from "starts_at" AT TIME ZONE 'UTC') = 19 AND extract(minute from "starts_at" AT TIME ZONE 'UTC') = 0;
