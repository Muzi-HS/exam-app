-- Keywords for mathematics education problems. Keep existing source/link data.
alter table public.past_exam_problems
  add column if not exists keywords text[] not null default '{}';
