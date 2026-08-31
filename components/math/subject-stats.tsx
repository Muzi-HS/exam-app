"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSubjectColor } from "@/lib/subject-colors";
import { fetchProgressMap, getProgress } from "@/lib/problem-progress";
import { StatusIcon } from "@/components/ui/status-icon";
import { cn } from "@/lib/utils";

interface StatusCounts {
  none: number;
  unknown: number;
  partial: number;
  mastered: number;
}

interface SubjectStat {
  id: string;
  name: string;
  order_index: number;
  total: number;
  counts: StatusCounts;
}

async function fetchSubjectStats(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<SubjectStat[]> {
  const [{ data: subjects, error: subjectsError }, { data: problems, error: problemsError }] =
    await Promise.all([
      supabase.from("math_subjects").select("id, name, order_index").order("order_index", { ascending: true }),
      supabase.from("math_problems").select("id, math_topics!inner(subject_id)"),
    ]);
  if (subjectsError) throw subjectsError;
  if (problemsError) throw problemsError;

  const rows = (problems ?? []) as { id: string; math_topics: { subject_id: string } }[];
  const progress = await fetchProgressMap(
    supabase,
    userId,
    rows.map((p) => p.id)
  );

  const countsBySubject = new Map<string, StatusCounts>();
  for (const p of rows) {
    const subjectId = p.math_topics.subject_id;
    const current = countsBySubject.get(subjectId) ?? { none: 0, unknown: 0, partial: 0, mastered: 0 };
    const key = getProgress(progress, p.id).current_status ?? "none";
    current[key] += 1;
    countsBySubject.set(subjectId, current);
  }

  return (subjects ?? []).map((s) => {
    const counts = countsBySubject.get(s.id) ?? { none: 0, unknown: 0, partial: 0, mastered: 0 };
    const total = counts.none + counts.unknown + counts.partial + counts.mastered;
    return { ...s, counts, total };
  });
}

export function SubjectStats() {
  const supabase = createClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["subject-stats"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      return fetchSubjectStats(supabase, user.id);
    },
  });

  if (isLoading) {
    return <p className="text-sm text-text-secondary">불러오는 중...</p>;
  }

  if (error) {
    return (
      <EmptyState
        title="통계를 불러오지 못했습니다"
        description="네트워크 상태를 확인하고 새로고침해 주세요."
      />
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title="등록된 과목이 없습니다" description="과목 관리에서 과목을 추가해 보세요." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((s) => {
        const color = getSubjectColor(s.order_index);
        return (
          <Card key={s.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "rounded-sm border px-2 py-0.5 text-xs font-medium",
                  color.border,
                  color.soft,
                  color.text
                )}
              >
                {s.name}
              </span>
              <span className="font-mono text-xs text-text-secondary">문제 {s.total}개</span>
            </div>

            {s.total === 0 ? (
              <p className="text-xs text-text-secondary">등록된 문제가 없습니다.</p>
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
                  {s.counts.mastered > 0 && (
                    <div
                      className="bg-status-mastered"
                      style={{ width: `${(s.counts.mastered / s.total) * 100}%` }}
                    />
                  )}
                  {s.counts.partial > 0 && (
                    <div
                      className="bg-status-partial"
                      style={{ width: `${(s.counts.partial / s.total) * 100}%` }}
                    />
                  )}
                  {s.counts.unknown > 0 && (
                    <div
                      className="bg-status-unknown"
                      style={{ width: `${(s.counts.unknown / s.total) * 100}%` }}
                    />
                  )}
                  {s.counts.none > 0 && (
                    <div className="bg-bg" style={{ width: `${(s.counts.none / s.total) * 100}%` }} />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <StatusIcon status="mastered" size={13} filled className="text-status-mastered" />
                    {s.counts.mastered}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <StatusIcon status="partial" size={13} filled className="text-status-partial" />
                    {s.counts.partial}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <StatusIcon status="unknown" size={13} filled className="text-status-unknown" />
                    {s.counts.unknown}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <StatusIcon status="none" size={13} className="text-text-secondary" />
                    {s.counts.none}
                  </span>
                </div>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
