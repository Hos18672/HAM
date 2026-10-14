ALTER TABLE "site_settings" ADD COLUMN "account_holder" varchar(70) DEFAULT '' NOT NULL;--> statement-breakpoint
-- The association's account, as the bank holds it. Only fills what is still
-- empty, so a value already typed into the admin settings is kept.
UPDATE "site_settings" SET "account_holder" = 'H.A.M. (Haus aller Menschen) - Vere' WHERE "account_holder" = '';--> statement-breakpoint
UPDATE "site_settings" SET "iban" = 'AT29 2011 1856 5232 9900' WHERE "iban" = '' OR "iban" ~ '^[A-Z]{2}[0\s]*$';
