-- Already applied to the connected project. Run with an administrative migration role on a new database.
create index if not exists questions_active_skill_difficulty_id_idx
  on public.questions(skill_id,difficulty,id) where status='active';
create index if not exists att_user_question_created_idx
  on public.attempts(user_id,question_id,created_at desc,id desc);
create index if not exists qs_user_served_at_idx
  on public.question_serves(user_id,served_at desc);
