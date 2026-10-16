CREATE TABLE "concept_questions" (
	"concept_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concept_questions_concept_id_question_id_pk" PRIMARY KEY("concept_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "concept_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "skill_concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" text NOT NULL,
	"title" text NOT NULL,
	"explanation_md" text DEFAULT '' NOT NULL,
	"sort" smallint DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_concepts_title_check" CHECK (length("skill_concepts"."title") between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "skill_concepts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "concept_questions" ADD CONSTRAINT "concept_questions_concept_id_skill_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."skill_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_questions" ADD CONSTRAINT "concept_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concept_questions_question_idx" ON "concept_questions" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "skill_concepts_skill_sort_idx" ON "skill_concepts" USING btree ("skill_id","sort");