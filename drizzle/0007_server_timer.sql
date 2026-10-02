CREATE TABLE "question_serves" (
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"served_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_serves_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "test_items" ADD COLUMN "served_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "question_serves" ADD CONSTRAINT "question_serves_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;