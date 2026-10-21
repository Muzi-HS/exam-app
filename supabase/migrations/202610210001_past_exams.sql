-- Mathematics education past exams (apply after the existing schema).
create table if not exists public.past_exam_categories (
  id text primary key default gen_random_uuid()::text,
  parent_id text references public.past_exam_categories(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  order_index integer not null default 0
);
create table if not exists public.past_exam_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category_id text not null references public.past_exam_categories(id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  year integer check (year between 1900 and 2200),
  source text not null default '',
  problem_number text not null default '',
  content text not null default '',
  solution_content text not null default '',
  memo text not null default '',
  youtube_url text not null default '',
  problem_images text[] not null default '{}',
  solution_images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint past_exam_has_content check (length(trim(content)) > 0 or cardinality(problem_images) > 0)
);
create index if not exists past_exam_problems_category_idx on public.past_exam_problems(category_id);
alter table public.past_exam_categories enable row level security;
alter table public.past_exam_problems enable row level security;
drop policy if exists past_exam_categories_shared on public.past_exam_categories;
create policy past_exam_categories_shared on public.past_exam_categories
  for all using (public.is_shared_account()) with check (public.is_shared_account());
drop policy if exists past_exam_problems_shared on public.past_exam_problems;
create policy past_exam_problems_shared on public.past_exam_problems
  for all using (public.is_shared_account()) with check (public.is_shared_account());
drop trigger if exists set_updated_at on public.past_exam_problems;
create trigger set_updated_at before update on public.past_exam_problems
  for each row execute function public.set_updated_at();

insert into public.past_exam_categories (id, parent_id, name, order_index) values
  ('past-root-0', null, '수학교육학', 0),
  ('past-root-0-0', 'past-root-0', '설명적 이해', 0),
  ('past-root-0-0-0', 'past-root-0-0', '수학교육의 발달', 0),
  ('past-root-0-0-1', 'past-root-0-0', '수학교육의 목적', 1),
  ('past-root-0-1', 'past-root-0', '내용적 이해', 1),
  ('past-root-0-1-0', 'past-root-0-1', '절대주의', 0),
  ('past-root-0-1-1', 'past-root-0-1', '수학기초론', 1),
  ('past-root-0-1-2', 'past-root-0-1', '준경험주의', 2),
  ('past-root-0-1-3', 'past-root-0-1', '구성주의', 3),
  ('past-root-0-1-4', 'past-root-0-1', '문제의 구성요소', 4),
  ('past-root-0-1-5', 'past-root-0-1', '문제해결 전략(추론유형)', 5),
  ('past-root-0-1-6', 'past-root-0-1', '문제해결 전략(발견술)', 6),
  ('past-root-0-1-7', 'past-root-0-1', '문제해결 전략(해결 전략)', 7),
  ('past-root-0-1-8', 'past-root-0-1', '문제해결 과정', 8),
  ('past-root-0-1-9', 'past-root-0-1', '문제제기', 9),
  ('past-root-0-2', 'past-root-0', '교육적 이해', 2),
  ('past-root-0-2-0', 'past-root-0-2', '형태심리학', 0),
  ('past-root-0-2-1', 'past-root-0-2', '유의미 학습', 1),
  ('past-root-0-2-2', 'past-root-0-2', '연합주의 심리학', 2),
  ('past-root-0-2-3', 'past-root-0-2', '피아제', 3),
  ('past-root-0-2-4', 'past-root-0-2', '브루너', 4),
  ('past-root-0-2-5', 'past-root-0-2', '비고츠키', 5),
  ('past-root-0-2-6', 'past-root-0-2', '스켐프', 6),
  ('past-root-0-2-7', 'past-root-0-2', '딘즈', 7),
  ('past-root-0-2-8', 'past-root-0-2', '오수벨', 8),
  ('past-root-0-2-9', 'past-root-0-2', '가네', 9),
  ('past-root-0-2-10', 'past-root-0-2', '프로이덴탈', 10),
  ('past-root-0-2-11', 'past-root-0-2', '반힐레', 11),
  ('past-root-0-2-12', 'past-root-0-2', '쉐발라드', 12),
  ('past-root-0-2-13', 'past-root-0-2', '브루소', 13),
  ('past-root-0-2-14', 'past-root-0-2', '공학도구', 14),
  ('past-root-0-3', 'past-root-0', '평가', 3),
  ('past-root-0-3-0', 'past-root-0-3', '수학과 평가 동향', 0),
  ('past-root-0-3-1', 'past-root-0-3', '수학과 평가틀', 1),
  ('past-root-0-3-2', 'past-root-0-3', '서술형 평가', 2),
  ('past-root-0-3-3', 'past-root-0-3', '프로젝트 평가', 3),
  ('past-root-0-3-4', 'past-root-0-3', '포트폴리오 평가', 4),
  ('past-root-0-3-5', 'past-root-0-3', '관찰 및 면담 평가', 5),
  ('past-root-1', null, '수학교육과정과 교재연구', 1),
  ('past-root-1-0', 'past-root-1', '수와 연산', 0),
  ('past-root-1-1', 'past-root-1', '대수', 1),
  ('past-root-1-2', 'past-root-1', '함수', 2),
  ('past-root-1-3', 'past-root-1', '기하와 증명', 3),
  ('past-root-1-4', 'past-root-1', '미분과 적분', 4),
  ('past-root-1-5', 'past-root-1', '확률과 통계', 5)
on conflict (id) do nothing;
