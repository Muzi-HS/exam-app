"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 30;

interface TimelineEntry {
  id: string;
  status: "unknown" | "partial" | "mastered";
  created_at: string;
  problemId: string;
  problemTitle: string;
}

export function ProgressTimeline() {
  const supabase = createClient();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading, error } = useQuery({
    queryKey: ["progress-timeline", limit],
    queryFn: async () => {
      const { data: history, error: historyError } = await supabase
        .from("progress_history")
        .select("id, status, created_at, item_id")
        .eq("item_type", "math_problem")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (historyError) throw historyError;

      const problemIds = Array.from(new Set((history ?? []).map((h) => h.item_id)));
      let titleMap = new Map<string, string>();
      if (problemIds.length > 0) {
        const { data: problems, error: problemsError } = await supabase
          .from("math_problems")
          .select("id, title")
          .in("id", problemIds);
        if (problemsError) throw problemsError;
        titleMap = new Map((problems ?? []).map((p) => [p.id, p.title]));
      }

      const entries: TimelineEntry[] = (history ?? []).map((h) => ({
        id: h.id,
        status: h.status,
        created_at: h.created_at,
        problemId: h.item_id,
        problemTitle: titleMap.get(h.item_id) ?? "(삭제된 문제)",
      }));

      return entries;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-text-secondary">불러오는 중...</p>;
  }

  if (error) {
    return (
      <EmptyState
        title="이력을 불러오지 못했습니다"
        description="네트워크 상태를 확인하고 새로고침해 주세요."
      />
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title="이해도 변경 이력이 없습니다" description="문제를 풀고 이해도를 기록해 보세요." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((entry) => (
        <Link
          key={entry.id}
          href={`/math/problems/${entry.problemId}`}
          className="flex items-center justify-between gap-3 rounded-sm border border-border bg-surface px-3 py-2 transition-colors hover:border-accent"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-text-primary">{entry.problemTitle}</p>
            <p className="font-mono text-xs text-text-secondary">{formatDateTime(entry.created_at)}</p>
          </div>
          <StatusPill status={entry.status} />
        </Link>
      ))}

      {data.length >= limit && (
        <Button type="button" variant="secondary" className="self-center" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
          더 보기
        </Button>
      )}
    </div>
  );
}
