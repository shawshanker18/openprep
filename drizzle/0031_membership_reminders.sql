CREATE TABLE "membership_reminders" (
	"user_id" uuid NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_reminders_user_id_ends_at_pk" PRIMARY KEY("user_id","ends_at")
);
--> statement-breakpoint
ALTER TABLE "membership_reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "membership_reminders" ADD CONSTRAINT "membership_reminders_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;