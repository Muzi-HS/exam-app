-- =====================================================================
-- 임용고시 학습 시스템 - Phase 1 스키마
-- Supabase SQL Editor에서 전체를 한 번에 실행하세요.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 확장
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- 1. profiles
--    Supabase Auth 사용자가 생성되면 자동으로 row가 생성됩니다.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- 2. 전공수학: 과목 / 소주제
-- ---------------------------------------------------------------------
create table if not exists math_subjects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists math_topics (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references math_subjects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_math_topics_subject on math_topics (subject_id);

-- ---------------------------------------------------------------------
-- 3. 전공수학: 문제 / 이미지 / 태그
-- ---------------------------------------------------------------------
create table if not exists math_problems (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references math_topics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source text,
  year integer,
  problem_number text,
  memo text,
  youtube_url text,
  is_favorite boolean not null default false,
  -- 연습/시험 출제 우선순위 계산용 캐시 컬럼 (Phase 3에서 사용)
  last_practiced_at timestamptz,
  -- progress_history는 이력을 절대 수정하지 않는 append-only 로그이므로,
  -- 목록 화면에서 상태별로 빠르게 표시/필터링하기 위한 캐시 컬럼입니다.
  -- 이해도를 변경할 때마다 progress_history insert와 함께 이 컬럼도 갱신됩니다.
  current_status text check (current_status in ('unknown', 'partial', 'mastered')),
  -- 이해도를 선택(=문제를 풀었다고 기록)할 때마다 1씩 증가하는 캐시 컬럼입니다.
  solve_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 이미 배포된 DB(Phase 1)에 Phase 2/4에서 추가된 컬럼을 반영하기 위한 안전한 마이그레이션.
-- 위 create table이 이미 실행되어 테이블이 존재하는 경우에도 이 문장들만 추가로 적용됩니다.
alter table math_problems add column if not exists current_status text
  check (current_status in ('unknown', 'partial', 'mastered'));
alter table math_problems add column if not exists solve_count integer not null default 0;

create index if not exists idx_math_problems_topic on math_problems (topic_id);
create index if not exists idx_math_problems_user on math_problems (user_id);
create index if not exists idx_math_problems_favorite on math_problems (user_id, is_favorite);
create index if not exists idx_math_problems_status on math_problems (user_id, current_status);
-- 연습 모드의 "오래 학습하지 않은 문제 우선" 출제 정렬용
create index if not exists idx_math_problems_last_practiced on math_problems (user_id, last_practiced_at);

-- 이해도 선택("문제 풀이") 시 solve_count를 원자적으로 증가시킵니다.
-- security definer가 아니므로 math_problems의 RLS(owner-only)가 그대로 적용됩니다.
create or replace function increment_solve_count(p_problem_id uuid)
returns integer as $$
declare
  new_count integer;
begin
  update math_problems
  set solve_count = solve_count + 1
  where id = p_problem_id
  returning solve_count into new_count;
  return new_count;
end;
$$ language plpgsql;

grant execute on function increment_solve_count(uuid) to authenticated;
create index if not exists idx_math_problems_title_trgm on math_problems using gin (title gin_trgm_ops);

create table if not exists problem_images (
  id uuid primary key default uuid_generate_v4(),
  problem_id uuid not null references math_problems (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  image_type text not null check (image_type in ('problem', 'solution')),
  storage_path text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_problem_images_problem on problem_images (problem_id, image_type);

create table if not exists tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists problem_tags (
  problem_id uuid not null references math_problems (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (problem_id, tag_id)
);

-- ---------------------------------------------------------------------
-- 4. 교육학 / 수학교육: 마인드맵
-- ---------------------------------------------------------------------
create table if not exists mindmap_topics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null check (domain in ('pedagogy', 'math_education')),
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mindmap_topics_domain on mindmap_topics (user_id, domain);

create table if not exists mindmap_nodes (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references mindmap_topics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null check (domain in ('pedagogy', 'math_education')),
  parent_node_id uuid references mindmap_nodes (id) on delete cascade,
  name text not null,
  description text,
  keywords text,
  memo text,
  order_index integer not null default 0,
  is_collapsed boolean not null default false,
  -- PC 캔버스형 마인드맵에서 노드를 자유 배치한 좌표. null이면 자동 배치합니다.
  position_x double precision,
  position_y double precision,
  last_practiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 이미 배포된 DB에 Phase 4에서 추가된 컬럼을 반영하기 위한 안전한 마이그레이션.
alter table mindmap_nodes add column if not exists position_x double precision;
alter table mindmap_nodes add column if not exists position_y double precision;

create index if not exists idx_mindmap_nodes_topic on mindmap_nodes (topic_id);
create index if not exists idx_mindmap_nodes_parent on mindmap_nodes (parent_node_id);
create index if not exists idx_mindmap_nodes_domain on mindmap_nodes (user_id, domain);

create table if not exists concept_questions (
  id uuid primary key default uuid_generate_v4(),
  node_id uuid not null references mindmap_nodes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  answer text not null,
  memo text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_concept_questions_node on concept_questions (node_id);

-- ---------------------------------------------------------------------
-- 5. 이해도 이력 (전공수학 문제 + 교육학/수학교육 개념문제 공통)
-- ---------------------------------------------------------------------
create table if not exists progress_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('math_problem', 'concept_question')),
  item_id uuid not null,
  status text not null check (status in ('unknown', 'partial', 'mastered')),
  created_at timestamptz not null default now()
);

create index if not exists idx_progress_history_item on progress_history (item_type, item_id, created_at desc);
create index if not exists idx_progress_history_user on progress_history (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. 연습 / 시험 세션
-- ---------------------------------------------------------------------
create table if not exists study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null check (domain in ('math', 'pedagogy', 'math_education')),
  mode text not null check (mode in ('practice', 'exam')),
  filter_json jsonb,
  item_count integer not null default 0,
  time_limit_seconds integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_study_sessions_user on study_sessions (user_id, started_at desc);

create table if not exists study_session_items (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references study_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('math_problem', 'concept_question')),
  item_id uuid not null,
  order_index integer not null default 0,
  self_rating text check (self_rating in ('unknown', 'partial', 'mastered')),
  answered_at timestamptz
);

create index if not exists idx_study_session_items_session on study_session_items (session_id, order_index);

-- =====================================================================
-- Row Level Security
-- 모든 테이블: 본인(user_id = auth.uid())의 데이터만 읽고 쓸 수 있습니다.
-- =====================================================================

alter table profiles enable row level security;
alter table math_subjects enable row level security;
alter table math_topics enable row level security;
alter table math_problems enable row level security;
alter table problem_images enable row level security;
alter table tags enable row level security;
alter table problem_tags enable row level security;
alter table mindmap_topics enable row level security;
alter table mindmap_nodes enable row level security;
alter table concept_questions enable row level security;
alter table progress_history enable row level security;
alter table study_sessions enable row level security;
alter table study_session_items enable row level security;

create policy "profiles_self" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "math_subjects_owner" on math_subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "math_topics_owner" on math_topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "math_problems_owner" on math_problems
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "problem_images_owner" on problem_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tags_owner" on tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- problem_tags는 user_id 컬럼이 없으므로 problem_id를 통해 소유권을 확인합니다.
create policy "problem_tags_owner" on problem_tags
  for all using (
    exists (
      select 1 from math_problems p
      where p.id = problem_tags.problem_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from math_problems p
      where p.id = problem_tags.problem_id and p.user_id = auth.uid()
    )
  );

create policy "mindmap_topics_owner" on mindmap_topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "mindmap_nodes_owner" on mindmap_nodes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "concept_questions_owner" on concept_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "progress_history_owner" on progress_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "study_sessions_owner" on study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "study_session_items_owner" on study_session_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Storage: 문제/해설 이미지 버킷
-- 경로 규칙: {user_id}/{problem_id}/{image_type}/{filename}
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('problem-images', 'problem-images', true)
on conflict (id) do nothing;

create policy "problem_images_storage_owner_select" on storage.objects
  for select using (
    bucket_id = 'problem-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "problem_images_storage_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'problem-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "problem_images_storage_owner_update" on storage.objects
  for update using (
    bucket_id = 'problem-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "problem_images_storage_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'problem-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- updated_at 자동 갱신 트리거
-- =====================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'math_subjects', 'math_topics', 'math_problems',
    'mindmap_topics', 'mindmap_nodes', 'concept_questions'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on %I; create trigger set_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end $$;
