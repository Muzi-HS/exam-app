import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PastExam } from "@/lib/past-exams";

export async function createPastExamPractice(supabase: SupabaseClient<Database>, ids: string[], categoryIds: string[] = []) {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) throw new Error("연습할 문제를 선택해 주세요.");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("로그인이 필요합니다.");
  const { data: session, error } = await supabase.from("study_sessions").insert({
    user_id: user.id, domain: "math_education", mode: "practice", item_count: uniqueIds.length,
    filter_json: { kind: "past_exam", categoryIds },
  }).select("id").single();
  if (error) throw error;
  const { error: itemsError } = await supabase.from("study_session_items").insert(uniqueIds.map((id, index) => ({
    session_id: session.id, user_id: user.id, item_type: "past_exam_problem" as const, item_id: id, order_index: index,
  })));
  if (itemsError) {
    await supabase.from("study_sessions").delete().eq("id", session.id);
    if (itemsError.code === "23514") throw new Error("기출문제 연습용 추가 SQL(202610210002_past_exam_practice.sql)을 먼저 적용해 주세요.");
    throw itemsError;
  }
  return session.id;
}

export async function fetchPastExamPractice(supabase: SupabaseClient<Database>, id: string) {
  const { data: session, error } = await supabase.from("study_sessions").select("*").eq("id", id)
    .eq("domain", "math_education").eq("mode", "practice").single();
  if (error) throw error;
  if (session.filter_json?.kind !== "past_exam") throw new Error("기출문제 연습 세션이 아닙니다. 연습 설정에서 새로 시작해 주세요.");
  const { data: items, error: itemsError } = await supabase.from("study_session_items").select("*")
    .eq("session_id", id).eq("item_type", "past_exam_problem").order("order_index");
  if (itemsError) throw itemsError;
  let problems: PastExam[] = [];
  if (items.length) {
    const result = await supabase.from("past_exam_problems").select("*").in("id", items.map((item) => item.item_id));
    if (result.error) throw result.error;
    problems = result.data;
  }
  const problemMap = new Map(problems.map((problem) => [problem.id, problem]));
  const available = items.flatMap((item) => {
    const problem = problemMap.get(item.item_id);
    return problem ? [{ ...item, problem }] : [];
  });
  return { session, items: available, missingCount: items.length - available.length };
}

export function orderPracticeIds(ids: string[], count: number | "all", random: boolean) {
  const result = [...ids];
  if (random) {
    for (let index = result.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
  }
  return count === "all" ? result : result.slice(0, count);
}
