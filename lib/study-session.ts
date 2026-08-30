import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProblemStatus } from "@/types/database";

// 진행/결과 화면에서 실제로 쓰는 필드만 골라 select 하기 위한 좁은 타입입니다
// (study_sessions 전체 Row가 아니라 이 부분만 네트워크로 가져옵니다).
export interface StudySessionMeta {
  id: string;
  time_limit_seconds: number | null;
  started_at: string;
  ended_at: string | null;
}

export type DrawOrder = "random" | "stale" | "weak";

export interface SessionFilters {
  subjectIds: string[];
  topicIds: string[];
  statuses: ProblemStatus[];
}

export interface CandidateProblem {
  id: string;
  last_practiced_at: string | null;
  current_status: ProblemStatus | null;
}

interface CandidateRow extends CandidateProblem {
  math_topics: { subject_id: string };
}

const STATUS_RANK: Record<ProblemStatus, number> = { unknown: 0, partial: 1, mastered: 2 };

export async function fetchCandidateProblems(
  supabase: SupabaseClient<Database>,
  filters: SessionFilters
): Promise<CandidateProblem[]> {
  let query = supabase
    .from("math_problems")
    .select("id, last_practiced_at, current_status, math_topics!inner(subject_id)");

  if (filters.subjectIds.length > 0) query = query.in("math_topics.subject_id", filters.subjectIds);
  if (filters.topicIds.length > 0) query = query.in("topic_id", filters.topicIds);
  if (filters.statuses.length > 0) query = query.in("current_status", filters.statuses);

  const { data, error } = await query.returns<CandidateRow[]>();
  if (error) throw error;
  return data ?? [];
}

// 학습되지 않은(null) 문제는 "가장 오래됨"/"가장 이해도 낮음" 취급으로 우선 출제 대상이 됩니다.
export function pickProblemIds(
  candidates: CandidateProblem[],
  order: DrawOrder,
  count: number | "all"
): string[] {
  const sorted = [...candidates];
  if (order === "random") {
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  } else if (order === "stale") {
    sorted.sort((a, b) => {
      const at = a.last_practiced_at ? new Date(a.last_practiced_at).getTime() : -Infinity;
      const bt = b.last_practiced_at ? new Date(b.last_practiced_at).getTime() : -Infinity;
      return at - bt;
    });
  } else {
    sorted.sort((a, b) => {
      const ar = a.current_status ? STATUS_RANK[a.current_status] : -1;
      const br = b.current_status ? STATUS_RANK[b.current_status] : -1;
      return ar - br;
    });
  }
  const ids = sorted.map((c) => c.id);
  return count === "all" ? ids : ids.slice(0, count);
}

export async function createStudySession(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    mode: "practice" | "exam";
    problemIds: string[];
    filters: SessionFilters;
    order: DrawOrder;
    timeLimitSeconds: number | null;
  }
): Promise<string> {
  const { data: session, error: sessionError } = await supabase
    .from("study_sessions")
    .insert({
      user_id: params.userId,
      domain: "math",
      mode: params.mode,
      filter_json: { ...params.filters, order: params.order },
      item_count: params.problemIds.length,
      time_limit_seconds: params.timeLimitSeconds,
    })
    .select("id")
    .single();
  if (sessionError || !session) throw sessionError ?? new Error("세션을 생성하지 못했습니다.");

  if (params.problemIds.length > 0) {
    const items = params.problemIds.map((id, index) => ({
      session_id: session.id,
      user_id: params.userId,
      item_type: "math_problem" as const,
      item_id: id,
      order_index: index,
    }));
    const { error: itemsError } = await supabase.from("study_session_items").insert(items);
    if (itemsError) throw itemsError;
  }

  return session.id;
}

export interface SessionProblemImage {
  id: string;
  storage_path: string;
  image_type: "problem" | "solution";
  order_index: number;
}

export interface SessionProblemInfo {
  id: string;
  title: string;
  problem_number: string | null;
  memo: string | null;
  youtube_url: string | null;
  solve_count: number;
  math_topics: { name: string; math_subjects: { name: string } };
  problem_images: SessionProblemImage[];
}

export interface SessionItem {
  id: string;
  item_id: string;
  order_index: number;
  self_rating: ProblemStatus | null;
  answered_at: string | null;
  problem: SessionProblemInfo;
}

export async function fetchSessionWithItems(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<{ session: StudySessionMeta; items: SessionItem[] }> {
  const { data: session, error: sessionError } = await supabase
    .from("study_sessions")
    .select("id, time_limit_seconds, started_at, ended_at")
    .eq("id", sessionId)
    .single();
  if (sessionError || !session) throw sessionError ?? new Error("세션을 찾을 수 없습니다.");

  const { data: items, error: itemsError } = await supabase
    .from("study_session_items")
    .select("id, item_id, order_index, self_rating, answered_at")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });
  if (itemsError) throw itemsError;

  const problemIds = (items ?? []).map((i) => i.item_id);
  let problems: SessionProblemInfo[] = [];
  if (problemIds.length > 0) {
    const { data, error: problemsError } = await supabase
      .from("math_problems")
      .select(
        "id, title, problem_number, memo, youtube_url, solve_count," +
          " math_topics!inner(name, math_subjects!inner(name))," +
          " problem_images(id, storage_path, image_type, order_index)"
      )
      .in("id", problemIds)
      .returns<SessionProblemInfo[]>();
    if (problemsError) throw problemsError;
    problems = data ?? [];
  }

  // 문제가 이후에 삭제된 경우 세션 항목에서 조용히 제외합니다(진행/결과 화면이 깨지지 않도록).
  const problemMap = new Map(problems.map((p) => [p.id, p]));
  const merged: SessionItem[] = (items ?? [])
    .map((item) => ({ ...item, problem: problemMap.get(item.item_id) }))
    .filter((item): item is SessionItem => !!item.problem);

  return { session, items: merged };
}

// 문제 이해도를 변경할 때마다 호출: progress_history에 append하고
// math_problems 캐시 컬럼(current_status, last_practiced_at, solve_count)을 함께 갱신합니다.
export async function recordProgress(
  supabase: SupabaseClient<Database>,
  params: { userId: string; problemId: string; status: ProblemStatus }
): Promise<{ recordedAt: string; solveCount: number }> {
  const { error: historyError } = await supabase.from("progress_history").insert({
    user_id: params.userId,
    item_type: "math_problem",
    item_id: params.problemId,
    status: params.status,
  });
  if (historyError) throw historyError;

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("math_problems")
    .update({ current_status: params.status, last_practiced_at: now })
    .eq("id", params.problemId);
  if (updateError) throw updateError;

  const { data: solveCount, error: rpcError } = await supabase.rpc("increment_solve_count", {
    p_problem_id: params.problemId,
  });
  if (rpcError) throw rpcError;

  return { recordedAt: now, solveCount: solveCount ?? 0 };
}
