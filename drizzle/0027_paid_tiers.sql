CREATE TABLE "paypal_events" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "paypal_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "question_remixes" (
	"source_id" text NOT NULL,
	"direction" text NOT NULL,
	"remix_id" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_remixes_source_id_direction_pk" PRIMARY KEY("source_id","direction"),
	CONSTRAINT "question_remixes_direction_check" CHECK ("question_remixes"."direction" in ('easier', 'same', 'harder'))
);
--> statement-breakpoint
ALTER TABLE "question_remixes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "remix_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "remix_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tier" text NOT NULL,
	"status" text NOT NULL,
	"paypal_subscription_id" text NOT NULL,
	"current_period_end" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_tier_check" CHECK ("subscriptions"."tier" in ('plus', 'pro')),
	CONSTRAINT "subscriptions_status_check" CHECK ("subscriptions"."status" in ('pending', 'active', 'cancelled', 'suspended', 'expired'))
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_pool_check";--> statement-breakpoint
ALTER TABLE "question_remixes" ADD CONSTRAINT "question_remixes_source_id_questions_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_remixes" ADD CONSTRAINT "question_remixes_remix_id_questions_id_fk" FOREIGN KEY ("remix_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_remixes" ADD CONSTRAINT "question_remixes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remix_usage" ADD CONSTRAINT "remix_usage_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_remixes_remix_idx" ON "question_remixes" USING btree ("remix_id");--> statement-breakpoint
CREATE INDEX "remix_usage_user_time" ON "remix_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "remix_usage_time" ON "remix_usage" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_paypal_idx" ON "subscriptions" USING btree ("paypal_subscription_id");--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_pool_check" CHECK ("questions"."pool" in ('study', 'test', 'remix'));