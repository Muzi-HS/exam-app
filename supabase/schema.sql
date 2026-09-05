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
  current_status text check (current_status in ('blank', 'unknown', 'partial', 'mastered')),
  -- 이해도를 선택(=문제를 풀었다고 기록)할 때마다 1씩 증가하는 캐시 컬럼입니다.
  solve_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 이미 배포된 DB(Phase 1)에 Phase 2/4에서 추가된 컬럼을 반영하기 위한 안전한 마이그레이션.
-- 위 create table이 이미 실행되어 테이블이 존재하는 경우에도 이 문장들만 추가로 적용됩니다.
alter table math_problems add column if not exists current_status text
  check (current_status in ('blank', 'unknown', 'partial', 'mastered'));
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
  -- 빈칸 퀴즈 모드에서 이 노드의 이름을 가려서 빈칸으로 표시할지 여부.
  is_blank boolean not null default false,
  last_practiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 이미 배포된 DB에 Phase 4에서 추가된 컬럼을 반영하기 위한 안전한 마이그레이션.
alter table mindmap_nodes add column if not exists position_x double precision;
alter table mindmap_nodes add column if not exists position_y double precision;
alter table mindmap_nodes add column if not exists is_blank boolean not null default false;

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
-- 4-1. 수학교육: 키워드 빵꾸노트 (책을 그대로 넘겨보는 형태 — 마인드맵과 별개)
--    주제(keyword_note_topics) 하나가 페이지 하나이고, 그 안에 개념
--    (keyword_note_concepts)들이 순서대로 나열됩니다.
--    book: 어느 빵꾸노트 책인지 ('kim' = 김민아, 'lee' = 이지윤). 탭이 책별로 나뉩니다.
-- ---------------------------------------------------------------------
create table if not exists keyword_note_topics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  book text not null default 'kim' check (book in ('kim', 'lee')),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_keyword_note_topics_book on keyword_note_topics (book, order_index);

create table if not exists keyword_note_concepts (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references keyword_note_topics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- 빈칸 위치를 "___"로 표시한 원문. 예: "수학의 ___, ___을 이해하고 ..."
  question text not null,
  -- question에 나오는 "___" 순서대로 정답 단어/구를 담은 배열. 예: ["개념", "원리"]
  blanks jsonb not null default '[]'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_keyword_note_concepts_topic on keyword_note_concepts (topic_id);

-- ---------------------------------------------------------------------
-- 5. 이해도 이력 (전공수학 문제 + 교육학/수학교육 개념문제 공통)
-- ---------------------------------------------------------------------
create table if not exists progress_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('math_problem', 'concept_question')),
  item_id uuid not null,
  status text not null check (status in ('blank', 'unknown', 'partial', 'mastered')),
  created_at timestamptz not null default now()
);

create index if not exists idx_progress_history_item on progress_history (item_type, item_id, created_at desc);
create index if not exists idx_progress_history_user on progress_history (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 5-1. 전공수학 문제별 "계정 개인" 진행 상태 (이해도 / 즐겨찾기 / 풀이횟수 / 최근학습일)
--    math_problems(과목/단원/문제/이미지/태그)는 계정 간 공유 콘텐츠지만, 이 정보만은
--    계정마다 완전히 분리해서 관리합니다.
-- ---------------------------------------------------------------------
create table if not exists problem_progress (
  problem_id uuid not null references math_problems (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  is_favorite boolean not null default false,
  current_status text check (current_status in ('blank', 'unknown', 'partial', 'mastered')),
  solve_count integer not null default 0,
  last_practiced_at timestamptz,
  -- 오답노트: 시험 결과 화면에서 "틀림"으로 표시하면 true가 되고, 이유를 함께 저장합니다.
  is_wrong boolean not null default false,
  wrong_reason text,
  updated_at timestamptz not null default now(),
  primary key (problem_id, user_id)
);

-- 이미 배포된 DB에 오답노트 기능(is_wrong/wrong_reason)을 추가하기 위한 안전한 마이그레이션.
alter table problem_progress add column if not exists is_wrong boolean not null default false;
alter table problem_progress add column if not exists wrong_reason text;

create index if not exists idx_problem_progress_user_status on problem_progress (user_id, current_status);
create index if not exists idx_problem_progress_user_favorite on problem_progress (user_id, is_favorite);
create index if not exists idx_problem_progress_user_last_practiced on problem_progress (user_id, last_practiced_at);
create index if not exists idx_problem_progress_user_wrong on problem_progress (user_id, is_wrong);

-- 이해도 선택 시 solve_count를 원자적으로 증가시킵니다(행이 없으면 1로 새로 만듭니다).
create or replace function increment_problem_progress_solve_count(p_problem_id uuid)
returns integer as $$
declare
  new_count integer;
begin
  insert into problem_progress (problem_id, user_id, solve_count)
  values (p_problem_id, auth.uid(), 1)
  on conflict (problem_id, user_id)
  do update set solve_count = problem_progress.solve_count + 1
  returning solve_count into new_count;
  return new_count;
end;
$$ language plpgsql;

grant execute on function increment_problem_progress_solve_count(uuid) to authenticated;

-- 기존(관리자) 계정의 math_problems 캐시 컬럼 값을 problem_progress로 1회 이관합니다.
-- 이미 이관된 뒤 재실행해도 안전합니다(on conflict do nothing).
insert into problem_progress (problem_id, user_id, is_favorite, current_status, solve_count, last_practiced_at, updated_at)
select id, user_id, is_favorite, current_status, solve_count, last_practiced_at, now()
from math_problems
on conflict (problem_id, user_id) do nothing;

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
  self_rating text check (self_rating in ('blank', 'unknown', 'partial', 'mastered')),
  answered_at timestamptz
);

create index if not exists idx_study_session_items_session on study_session_items (session_id, order_index);

-- =====================================================================
-- Row Level Security
-- 두 계정(관리자 + 두 번째 계정)이 전공수학/교육학/수학교육 콘텐츠를 동일한 권한으로
-- 함께 쓰는 공유 작업공간입니다. 이메일 allowlist로 판별하므로(auth.jwt()의 email
-- 클레임) 계정을 나중에 만들어도 미리 적용해 둘 수 있습니다.
-- 단, 이해도/즐겨찾기/오답노트(problem_progress)와 이력/세션은 계정별로 완전히
-- 분리됩니다(본인 것만 읽고 쓸 수 있음).
-- =====================================================================

alter table profiles enable row level security;
alter table math_subjects enable row level security;
alter table math_topics enable row level security;
alter table math_problems enable row level security;
alter table problem_images enable row level security;
alter table tags enable row level security;
alter table problem_tags enable row level security;
alter table problem_progress enable row level security;
alter table mindmap_topics enable row level security;
alter table mindmap_nodes enable row level security;
alter table concept_questions enable row level security;
alter table keyword_note_topics enable row level security;
alter table keyword_note_concepts enable row level security;
alter table progress_history enable row level security;
alter table study_sessions enable row level security;
alter table study_session_items enable row level security;

-- 공유 콘텐츠(과목/단원/문제/이미지/태그/마인드맵)에 접근 가능한 계정들을 한 곳에서
-- 관리합니다. 이메일이 바뀌거나 계정이 추가/제거되면 이 함수만 고치면 됩니다.
create or replace function is_shared_account()
returns boolean as $$
  select (auth.jwt() ->> 'email') in (
    'hs991219@naver.com',
    'ey2020202@gmail.com',
    'he9273@ajou.ac.kr',
    'kse0412@ajou.ac.kr'
  );
$$ language sql stable;

create policy "profiles_self" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "math_subjects_shared" on math_subjects
  for all using (is_shared_account()) with check (is_shared_account());

create policy "math_topics_shared" on math_topics
  for all using (is_shared_account()) with check (is_shared_account());

create policy "math_problems_shared" on math_problems
  for all using (is_shared_account()) with check (is_shared_account());

create policy "problem_images_shared" on problem_images
  for all using (is_shared_account()) with check (is_shared_account());

create policy "tags_shared" on tags
  for all using (is_shared_account()) with check (is_shared_account());

create policy "problem_tags_shared" on problem_tags
  for all using (is_shared_account()) with check (is_shared_account());

create policy "mindmap_topics_shared" on mindmap_topics
  for all using (is_shared_account()) with check (is_shared_account());

create policy "mindmap_nodes_shared" on mindmap_nodes
  for all using (is_shared_account()) with check (is_shared_account());

create policy "concept_questions_shared" on concept_questions
  for all using (is_shared_account()) with check (is_shared_account());

create policy "keyword_note_topics_shared" on keyword_note_topics
  for all using (is_shared_account()) with check (is_shared_account());

create policy "keyword_note_concepts_shared" on keyword_note_concepts
  for all using (is_shared_account()) with check (is_shared_account());

-- 이해도/즐겨찾기/오답노트는 계정별 소유 데이터라 owner-only 그대로 유지합니다.
create policy "problem_progress_owner" on problem_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "progress_history_owner" on progress_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "study_sessions_owner" on study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "study_session_items_owner" on study_session_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Storage: 문제/해설 이미지 버킷 (두 계정 모두 업로드/열람/삭제 가능)
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('problem-images', 'problem-images', true)
on conflict (id) do nothing;

create policy "problem_images_storage_shared_select" on storage.objects
  for select using (bucket_id = 'problem-images' and is_shared_account());

create policy "problem_images_storage_shared_insert" on storage.objects
  for insert with check (bucket_id = 'problem-images' and is_shared_account());

create policy "problem_images_storage_shared_update" on storage.objects
  for update using (bucket_id = 'problem-images' and is_shared_account());

create policy "problem_images_storage_shared_delete" on storage.objects
  for delete using (bucket_id = 'problem-images' and is_shared_account());

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
    'math_subjects', 'math_topics', 'math_problems', 'problem_progress',
    'mindmap_topics', 'mindmap_nodes', 'concept_questions',
    'keyword_note_topics', 'keyword_note_concepts'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on %I; create trigger set_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end $$;
