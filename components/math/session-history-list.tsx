"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Domain, SessionMode } from "@/types/database";

const MODE_LABEL: Record<SessionMode, string> = { practice: "연습", exam: "시험" };

const BASE_PATH: Record<Domain, string> = {
  math: "/math",
  pedagogy: "/pedagogy",
  math_education: "/math-education",
};

const PAGE_SIZE = 30;

export function SessionHistoryList({
  domain,
  modeFilter,
}: {
  domain: Domain;
  modeFilter?: SessionMode;
}) {
  const supabase = createClient();
  const basePath = BASE_PATH[domain];
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading, error } = useQuery({
    queryKey: ["study-sessions", domain, modeFilter ?? "all", limit],
    queryFn: async () => {
      let query = supabase
        .from("study_sessions")
        .select("id, mode, item_count, started_at, ended_at")
        .eq("domain", domain)
        .order("started_at", { ascending: false })
        .limit(limit);
      if (modeFilter) query = query.eq("mode", modeFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-text-secondary">불러오는 중...</p>;
  }

  if (error) {
    return (
      <EmptyState
        title="기록을 불러오지 못했습니다"
        description="네트워크 상태를 확인하고 새로고침해 주세요."
      />
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title="세션 기록이 없습니다" description="연습이나 시험을 시작해 보세요." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((s) => (
        <Link key={s.id} href={`${basePath}/${s.mode}/${s.id}`}>
          <Card className="flex items-center justify-between transition-colors hover:border-accent">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {formatDate(s.started_at)}
                {!modeFilter && (
                  <span className="ml-2 rounded-sm bg-accent-soft px-1.5 py-0.5 text-xs text-accent">
                    {MODE_LABEL[s.mode]}
                  </span>
                )}
              </p>
              <p className="mt-1 font-mono text-xs text-text-secondary">
                {s.item_count}문제
                {s.ended_at
                  ? ` · ${formatDuration(
                      (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000
                    )}`
                  : " · 진행 중"}
              </p>
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                s.ended_at ? "text-status-mastered" : "text-status-partial"
              )}
            >
              {s.ended_at ? "완료" : "미완료"}
            </span>
          </Card>
        </Link>
      ))}

      {data.length >= limit && (
        <Button
          type="button"
          variant="secondary"
          className="self-center"
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
        >
          더 보기
        </Button>
      )}
    </div>
  );
}
