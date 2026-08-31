import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProblemStatus } from "@/types/database";

// 전공수학 문제(math_problems)는 이제 계정 간 공유 콘텐츠이고, "이해도/즐겨찾기/풀이횟수/
// 최근학습일"만 계정별로 problem_progress 테이블에 따로 저장됩니다. 문제 목록을 계정별
// 진행 상태와 합쳐 보여줄 때는 이 파일의 헬퍼로 problem_id -> 진행 상태 맵을 만들어 씁니다.
export interface ProblemProgress {
  is_favorite: boolean;
  current_status: ProblemStatus | null;
  solve_count: number;
  last_practiced_at: string | null;
  is_wrong: boolean;
  wrong_reason: string | null;
}

export const EMPTY_PROGRESS: ProblemProgress = {
  is_favorite: false,
  current_status: null,
  solve_count: 0,
  last_practiced_at: null,
  is_wrong: false,
  wrong_reason: null,
};

// problemIds를 생략하면 해당 계정의 진행 상태 전체를 가져옵니다.
export async function fetchProgressMap(
  supabase: SupabaseClient<Database>,
  userId: string,
  problemIds?: string[]
): Promise<Map<string, ProblemProgress>> {
  if (problemIds && problemIds.length === 0) return new Map();

  let query = supabase
    .from("problem_progress")
    .select("problem_id, is_favorite, current_status, solve_count, last_practiced_at, is_wrong, wrong_reason")
    .eq("user_id", userId);
  if (problemIds) query = query.in("problem_id", problemIds);

  const { data, error } = await query;
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.problem_id, row]));
}

export function getProgress(map: Map<string, ProblemProgress>, problemId: string): ProblemProgress {
  return map.get(problemId) ?? EMPTY_PROGRESS;
}

export async function setFavorite(
  supabase: SupabaseClient<Database>,
  userId: string,
  problemId: string,
  isFavorite: boolean
): Promise<void> {
  const { error } = await supabase
    .from("problem_progress")
    .upsert(
      { problem_id: problemId, user_id: userId, is_favorite: isFavorite },
      { onConflict: "problem_id,user_id" }
    );
  if (error) throw error;
}

// 오답노트: 틀림으로 표시하면 이유(reason)와 함께 저장하고, 맞음으로 되돌리면 이유를 비웁니다.
export async function setWrongAnswer(
  supabase: SupabaseClient<Database>,
  userId: string,
  problemId: string,
  isWrong: boolean,
  reason: string | null
): Promise<void> {
  const { error } = await supabase.from("problem_progress").upsert(
    { problem_id: problemId, user_id: userId, is_wrong: isWrong, wrong_reason: isWrong ? reason : null },
    { onConflict: "problem_id,user_id" }
  );
  if (error) throw error;
}
