CREATE TABLE "membership_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	CONSTRAINT "membership_blocks_tier_check" CHECK ("membership_blocks"."tier" in ('plus', 'pro'))
);
--> statement-breakpoint
ALTER TABLE "membership_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "membership_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" text NOT NULL,
	"billing" text NOT NULL,
	"days" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"paypal_order_id" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "membership_purchases_tier_check" CHECK ("membership_purchases"."tier" in ('plus', 'pro')),
	CONSTRAINT "membership_purchases_billing_check" CHECK ("membership_purchases"."billing" in ('monthly', 'quarterly', 'until_test')),
	CONSTRAINT "membership_purchases_status_check" CHECK ("membership_purchases"."status" in ('created', 'completed', 'refunded'))
);
--> statement-breakpoint
ALTER TABLE "membership_purchases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "membership_blocks" ADD CONSTRAINT "membership_blocks_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_purchases" ADD CONSTRAINT "membership_purchases_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_blocks_user_idx" ON "membership_blocks" USING btree ("user_id","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_purchases_order_idx" ON "membership_purchases" USING btree ("paypal_order_id");--> statement-breakpoint
CREATE INDEX "membership_purchases_user_idx" ON "membership_purchases" USING btree ("user_id","created_at");