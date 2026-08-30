import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MindmapDomain } from "@/types/database";

// 진행/결과 화면에서 실제로 쓰는 필드만 골라 select 하기 위한 좁은 타입입니다.
export interface StudySessionMeta {
  id: string;
  time_limit_seconds: number | null;
  started_at: string;
  ended_at: string | null;
}

export async function fetchCandidateQuestionIds(
  supabase: SupabaseClient<Database>,
  domain: MindmapDomain,
  topicIds: string[]
): Promise<string[]> {
  let nodeQuery = supabase.from("mindmap_nodes").select("id").eq("domain", domain);
  if (topicIds.length > 0) nodeQuery = nodeQuery.in("topic_id", topicIds);
  const { data: nodes, error: nodesError } = await nodeQuery;
  if (nodesError) throw nodesError;
  const nodeIds = (nodes ?? []).map((n) => n.id);
  if (nodeIds.length === 0) return [];

  const { data, error } = await supabase.from("concept_questions").select("id").in("node_id", nodeIds);
  if (error) throw error;
  return (data ?? []).map((q) => q.id);
}

export function pickRandomIds(ids: string[], count: number | "all"): string[] {
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return count === "all" ? shuffled : shuffled.slice(0, count);
}

export async function createConceptSession(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    domain: MindmapDomain;
    mode: "practice" | "exam";
    questionIds: string[];
    timeLimitSeconds: number | null;
  }
): Promise<string> {
  const { data: session, error: sessionError } = await supabase
    .from("study_sessions")
    .insert({
      user_id: params.userId,
      domain: params.domain,
      mode: params.mode,
      item_count: params.questionIds.length,
      time_limit_seconds: params.timeLimitSeconds,
    })
    .select("id")
    .single();
  if (sessionError || !session) throw sessionError ?? new Error("세션을 생성하지 못했습니다.");

  if (params.questionIds.length > 0) {
    const items = params.questionIds.map((id, index) => ({
      session_id: session.id,
      user_id: params.userId,
      item_type: "concept_question" as const,
      item_id: id,
      order_index: index,
    }));
    const { error: itemsError } = await supabase.from("study_session_items").insert(items);
    if (itemsError) throw itemsError;
  }

  return session.id;
}

export interface ConceptQuestionInfo {
  id: string;
  question: string;
  answer: string;
  memo: string | null;
  mindmap_nodes: { name: string; mindmap_topics: { name: string } };
}

export interface ConceptSessionItem {
  id: string;
  item_id: string;
  order_index: number;
  answered_at: string | null;
  question: ConceptQuestionInfo;
}

export async function fetchConceptSessionWithItems(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<{ session: StudySessionMeta; items: ConceptSessionItem[] }> {
  const { data: session, error: sessionError } = await supabase
    .from("study_sessions")
    .select("id, time_limit_seconds, started_at, ended_at")
    .eq("id", sessionId)
    .single();
  if (sessionError || !session) throw sessionError ?? new Error("세션을 찾을 수 없습니다.");

  const { data: items, error: itemsError } = await supabase
    .from("study_session_items")
    .select("id, item_id, order_index, answered_at")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });
  if (itemsError) throw itemsError;

  const questionIds = (items ?? []).map((i) => i.item_id);
  let questions: ConceptQuestionInfo[] = [];
  if (questionIds.length > 0) {
    const { data, error: questionsError } = await supabase
      .from("concept_questions")
      .select("id, question, answer, memo, mindmap_nodes!inner(name, mindmap_topics!inner(name))")
      .in("id", questionIds)
      .returns<ConceptQuestionInfo[]>();
    if (questionsError) throw questionsError;
    questions = data ?? [];
  }

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  // 개념 문제가 이후에 삭제된 경우 세션 항목에서 조용히 제외합니다.
  const merged: ConceptSessionItem[] = (items ?? [])
    .map((item) => ({ ...item, question: questionMap.get(item.item_id) }))
    .filter((item): item is ConceptSessionItem => !!item.question);

  return { session, items: merged };
}

export async function markAnswered(
  supabase: SupabaseClient<Database>,
  itemId: string
): Promise<string> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("study_session_items")
    .update({ answered_at: now })
    .eq("id", itemId);
  if (error) throw error;
  return now;
}
