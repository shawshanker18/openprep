ALTER TABLE "profiles" ADD COLUMN "touch_seen" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "tablet_layout" text DEFAULT 'tabs' NOT NULL;