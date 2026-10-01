CREATE INDEX "qr_user_time" ON "question_reports" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "sat_user" ON "sat_attempts" USING btree ("user_id");