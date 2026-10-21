# 임용고시 학습 시스템

전공수학 / 교육학 / 수학교육을 하나의 앱에서 관리하는 개인용(관리자 1인) 학습 시스템입니다.
Next.js 14(App Router) + TypeScript + Tailwind CSS + Supabase(DB·Auth·Storage)로 만들어졌습니다.

## 기능 요약

- **전공수학**: 과목·단원 관리, 문제 등록(이미지 여러 장 업로드/압축, 해설, 유튜브 링크, 태그),
  문제 검색·필터, 이해도 3단계 기록, 즐겨찾기, 랜덤 연습·시험 모드, 과목별 이해도 통계
- **교육학 / 수학교육**: 주제 관리, 캔버스형(PC) / 트리형(모바일) 마인드맵, 개념별 문제(해설
  숨김), 랜덤 연습·시험 모드 — 두 영역은 같은 코드로 동작하고 데이터만 `domain` 컬럼으로 분리됩니다
- **모바일 대응**: 하단 네비게이션, 반응형 필터·모달, 이미지 라이트박스 핀치 줌
- **데이터 내보내기**: `/settings`에서 내 데이터 전체를 JSON 파일 하나로 다운로드 가능 (특정
  서비스에 종속되지 않기 위한 백업 기능 — 이미지 원본은 포함되지 않으며 Supabase Storage에서
  별도로 받아야 합니다)

## 1. Supabase 프로젝트 준비

1. https://supabase.com 에서 새 프로젝트를 만듭니다 (또는 기존 프로젝트를 사용해도 됩니다).
2. 왼쪽 메뉴 **SQL Editor** → `New query` → `supabase/schema.sql` 파일 내용을 전체 복사해서
   붙여넣고 **Run**을 누릅니다.
   - 테이블, 인덱스, RLS 정책, 함수, `problem-images` Storage 버킷까지 한 번에 생성/갱신됩니다.
   - `alter table ... add column if not exists`, `create ... if not exists` 형태로 작성되어
     있어 이미 실행한 적이 있어도 안전하게 다시 실행할 수 있습니다 (단, `create policy`는
     idempotent가 아니므로 정책이 이미 있는 상태에서 전체를 재실행하면 오류가 날 수 있습니다 —
     이 경우 새로 추가된 부분만 골라서 실행하세요).
3. 왼쪽 메뉴 **Authentication → Users** → `Add user`로 본인 계정(이메일/비밀번호)을 직접
   만듭니다.
   - 회원가입 화면은 따로 만들지 않았습니다. 관리자 1인만 사용하는 구조이므로 Supabase
     대시보드에서 계정을 직접 생성하는 방식입니다.
4. 왼쪽 메뉴 **Project Settings → API**에서 다음 두 값을 복사해 둡니다.
   - `Project URL`
   - `anon public` 키

## 2. 로컬 개발 환경 설정

기존 DB에 수학교육 **문제** 메뉴를 추가하려면 SQL Editor에서
`supabase/migrations/202610210001_past_exams.sql`을 실행하세요.
신규 DB는 `supabase/schema.sql`에 같은 내용이 포함되어 있습니다.
요청된 대분류·중분류·세부항목 45개가 등록되며, 재실행해도 수정한 분류 이름은 유지됩니다.
`/math-education/past-exams`에서 분류 필터·검색, 문제 등록·수정·삭제,
문제/해설 텍스트·수식·이미지, 연도·문제번호·키워드·메모를 관리할 수 있습니다.
목록의 **분류 수정**에서 분류를 선택하면 이름을 바꿀 수 있습니다.

문제 연습을 사용하려면 기존 DB의 SQL Editor에서
`supabase/migrations/202610210002_past_exam_practice.sql`도 실행하세요.
문제 목록과 연습 설정에서 전공수학처럼 분류를 여러 개 선택할 수 있으며,
목록에서 선택한 문제 또는 검색·분류 조건에 맞는 문제로 바로 연습할 수 있습니다.
연습 설정에서는 문제 수와 순서를 지정하고, 연습 중에는 해설 확인과 이해도 기록이 가능합니다.
연습 진행과 이해도는 계정별로 저장됩니다.

수학교육의 메뉴 이름은 **문제**이며, 등록·수정 화면에서 키워드를 여러 개 입력할 수 있습니다.
키워드 저장을 위해 기존 DB에는 `supabase/migrations/202610210003_problem_keywords.sql`을
추가로 실행하세요. 키워드는 상세 화면에 표시되고 목록 검색에도 포함됩니다.
출처·유튜브 URL 입력 항목은 제거되었습니다.

```bash
npm install
cp .env.local.example .env.local
```

`.env.local` 파일을 열어 위에서 복사한 값을 채워 넣습니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

http://localhost:3000 접속 → 로그인 화면으로 리다이렉트됩니다 → 1-3에서 만든 계정으로
로그인합니다. (다른 프로젝트의 개발 서버가 3000번 포트를 이미 쓰고 있다면 자동으로 3001번 등
다음 빈 포트로 뜹니다 — 터미널에 출력되는 실제 주소를 확인하세요.)

## 3. GitHub 연결

```bash
git init
git add .
git commit -m "Phase 1: 프로젝트 기초"
git branch -M main
git remote add origin https://github.com/Muzi-HS/exam-app.git
git push -u origin main
```

## 4. Vercel 배포

1. https://vercel.com 에서 `Add New → Project` → GitHub 저장소 선택
2. **Environment Variables**에 `.env.local`과 동일한 두 값을 등록
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy 클릭 → 배포 완료 후 발급되는 URL로 접속해 로그인 테스트

## 5. 데이터 백업

`/settings` → **데이터 내보내기**에서 전체 데이터(과목/문제/마인드맵/학습 기록 등)를 JSON
파일로 내려받을 수 있습니다. 이미지 원본은 포함되지 않으므로, Supabase 대시보드의
**Storage → problem-images** 버킷도 주기적으로 별도 백업해 두는 것을 권장합니다.

## 6. 테스트 체크리스트

**인증**
- [ ] 로그인 / 로그아웃
- [ ] 로그인하지 않고 아무 경로로 접속 시 `/login`으로 리다이렉트되는지

**전공수학**
- [ ] 과목/단원 생성·수정·삭제·순서변경
- [ ] 문제 등록(이미지 여러 장, 해설 이미지, 유튜브 URL), 수정, 삭제
- [ ] 이해도 변경 및 이력 기록, 검색·필터(과목→단원, 이해도, 즐겨찾기) 다중 선택
- [ ] 연습·시험 모드 전 과정(시험은 제한시간 포함), 시험 기록 재확인

**교육학 / 수학교육**
- [ ] 주제 생성·수정·삭제·순서변경
- [ ] 마인드맵 노드 생성·수정·삭제·이동·부모변경·펼치기/접기 (PC 캔버스 / 모바일 트리)
- [ ] 개념별 문제 등록, 해설 숨김 → 보기
- [ ] 랜덤 연습, 시험 모드

**공통**
- [ ] 모바일 폭에서 하단 네비게이션·모달·라이트박스가 정상 동작하는지
- [ ] 다크모드 토글
- [ ] 다른 브라우저(시크릿 창 포함)에서 같은 계정으로 로그인 시 동일한 데이터가 보이는지
      (모든 데이터가 Supabase에 저장되므로 기기 간 로컬 캐시에 의존하지 않습니다)
