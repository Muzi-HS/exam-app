import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { StatusValue } from "@/components/ui/status-icon";
import type { ProblemListItem } from "@/components/math/problem-row";
import { fetchProgressMap, getProgress } from "@/lib/problem-progress";

// 문제 목록/오답노트 화면이 공유하는 조회 로직입니다. 이해도/즐겨찾기/오답 여부는 계정별
// problem_progress에 있어 DB에서 바로 필터링할 수 없으므로, 과목/단원/태그/검색만 DB에서
// 거르고 나머지는 병합 후 클라이언트에서 필터링·정렬·페이지네이션합니다.
export interface MathProblemListFilters {
  subjectIds: string[];
  topicIds: string[];
  statuses: StatusValue[];
  tagIds: string[];
  favoriteOnly: boolean;
  wrongOnly: boolean;
  search: string;
}

interface ProblemQueryRow {
  id: string;
  title: string;
  problem_number: string | null;
  math_topics: {
    id: string;
    name: string;
    subject_id: string;
    math_subjects: { id: string; name: string; order_index: number };
  };
}

export async function fetchMathProblemsPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  filters: MathProblemListFilters,
  page: number,
  pageSize: number
): Promise<{ items: ProblemListItem[]; total: number }> {
  const hasTagFilter = filters.tagIds.length > 0;
  const selectCols =
    "id, title, problem_number," +
    " math_topics!inner(id, name, subject_id, math_subjects!inner(id, name, order_index))" +
    (hasTagFilter ? ", problem_tags!inner(tag_id)" : "");

  let query = supabase.from("math_problems").select(selectCols);

  if (filters.search) query = query.ilike("title", `%${filters.search}%`);
  if (filters.subjectIds.length > 0) query = query.in("math_topics.subject_id", filters.subjectIds);
  if (filters.topicIds.length > 0) query = query.in("topic_id", filters.topicIds);
  if (hasTagFilter) query = query.in("problem_tags.tag_id", filters.tagIds);

  const { data, error } = await query.returns<ProblemQueryRow[]>();
  if (error) throw error;

  const progress = await fetchProgressMap(
    supabase,
    userId,
    (data ?? []).map((p) => p.id)
  );

  let merged = (data ?? []).map((row) => ({ row, progress: getProgress(progress, row.id) }));

  if (filters.favoriteOnly) merged = merged.filter((m) => m.progress.is_favorite);
  if (filters.wrongOnly) merged = merged.filter((m) => m.progress.is_wrong);
  if (filters.statuses.length > 0) {
    merged = merged.filter((m) => {
      const key: StatusValue = m.progress.current_status ?? "none";
      return filters.statuses.includes(key);
    });
  }

  merged.sort((a, b) => {
    const subjectDiff =
      a.row.math_topics.math_subjects.order_index - b.row.math_topics.math_subjects.order_index;
    if (subjectDiff !== 0) return subjectDiff;
    const titleDiff = a.row.title.localeCompare(b.row.title, "ko");
    if (titleDiff !== 0) return titleDiff;
    return (a.row.problem_number ?? "").localeCompare(b.row.problem_number ?? "", "ko");
  });

  const total = merged.length;
  const pageRows = merged.slice(page * pageSize, page * pageSize + pageSize);

  const items: ProblemListItem[] = pageRows.map(({ row, progress: p }) => ({
    id: row.id,
    title: row.title,
    is_favorite: p.is_favorite,
    current_status: p.current_status,
    problem_number: row.problem_number,
    subjectName: row.math_topics.math_subjects.name,
    subjectOrderIndex: row.math_topics.math_subjects.order_index,
    topicName: row.math_topics.name,
  }));

  return { items, total };
}
