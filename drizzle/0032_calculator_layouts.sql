CREATE TABLE "calculator_layouts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"layout" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calculator_layouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calculator_layouts" ADD CONSTRAINT "calculator_layouts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;