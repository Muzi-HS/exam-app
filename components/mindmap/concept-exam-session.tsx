"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Timer, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchConceptSessionWithItems } from "@/lib/concept-session";
import { formatDate, formatDuration } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { MindmapDomain } from "@/types/database";

const BASE_PATH: Record<MindmapDomain, string> = {
  pedagogy: "/pedagogy",
  math_education: "/math-education",
};

type SessionData = Awaited<ReturnType<typeof fetchConceptSessionWithItems>>;

export function ConceptExamSession({
  domain,
  sessionId,
}: {
  domain: MindmapDomain;
  sessionId: string;
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const basePath = BASE_PATH[domain];

  const queryKey = ["concept-session", sessionId];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchConceptSessionWithItems(supabase, sessionId),
  });

  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const finishedRef = useRef(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const timeLimitSeconds = data?.session.time_limit_seconds ?? null;
  const startedAt = data?.session.started_at;
  const ended = !!data?.session.ended_at;

  async function handleFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinishing(true);
    try {
      const now = new Date().toISOString();
      await supabase.from("study_sessions").update({ ended_at: now }).eq("id", sessionId);
      queryClient.setQueryData<SessionData | undefined>(queryKey, (prev) =>
        prev ? { ...prev, session: { ...prev.session, ended_at: now } } : prev
      );
    } finally {
      setFinishing(false);
    }
  }

  useEffect(() => {
    if (!timeLimitSeconds || !startedAt || ended) return;
    const deadline = new Date(startedAt).getTime() + timeLimitSeconds * 1000;

    function tick() {
      const secondsLeft = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(secondsLeft);
      if (secondsLeft <= 0) handleFinish();
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLimitSeconds, startedAt, ended]);

  if (isLoading) {
    return <p className="text-sm text-text-secondary">불러오는 중...</p>;
  }

  if (error || !data) {
    return (
      <EmptyState
        title="시험을 불러오지 못했습니다"
        description="삭제되었거나 접근할 수 없는 시험 세션입니다."
      />
    );
  }

  const { session, items } = data;

  if (items.length === 0) {
    return <EmptyState title="문제가 없는 세션입니다" description="설정 화면에서 다시 시작해 주세요." />;
  }

  if (session.ended_at) {
    const durationSeconds =
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000;
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">시험 결과</h2>
          <p className="mt-1 font-mono text-xs text-text-secondary">
            {formatDate(session.started_at)} · {items.length}문제 · 소요 시간{" "}
            {formatDuration(durationSeconds)}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <ExamResultQuestion key={item.id} item={item} index={i} />
          ))}
        </div>
        <Link
          href={`${basePath}/exam`}
          className="inline-flex w-fit items-center gap-1.5 rounded-sm bg-accent px-3.5 py-2 text-sm font-medium text-bg transition-colors hover:opacity-90"
        >
          시험 목록으로
        </Link>
      </div>
    );
  }

  const item = items[index];
  const isLast = index === items.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-text-secondary">
          {index + 1} / {items.length}
        </span>
        {remaining !== null && (
          <span className="flex items-center gap-1.5 font-mono text-sm font-medium text-text-primary">
            <Timer size={15} strokeWidth={1.75} />
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:
            {String(remaining % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      <Card className="flex flex-col gap-2">
        <p className="text-xs text-text-secondary">
          {item.question.mindmap_nodes.mindmap_topics.name} · {item.question.mindmap_nodes.name}
        </p>
        <p className="whitespace-pre-wrap text-base text-text-primary">{item.question.question}</p>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ChevronLeft size={16} strokeWidth={1.75} />
          이전 문제
        </Button>
        {isLast ? (
          <Button type="button" variant="danger" onClick={handleFinish} disabled={finishing}>
            {finishing ? "제출하는 중..." : "시험 제출"}
          </Button>
        ) : (
          <Button type="button" onClick={() => setIndex(index + 1)}>
            다음 문제
            <ChevronRight size={16} strokeWidth={1.75} />
          </Button>
        )}
      </div>

      {!isLast && (
        <Button type="button" variant="ghost" className="self-center" onClick={handleFinish} disabled={finishing}>
          지금 제출하고 종료
        </Button>
      )}
    </div>
  );
}

function ExamResultQuestion({
  item,
  index,
}: {
  item: SessionData["items"][number];
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between gap-2 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs text-text-secondary">
            {index + 1}. {item.question.mindmap_nodes.mindmap_topics.name} · {item.question.mindmap_nodes.name}
          </p>
          <p className="truncate text-sm font-medium text-text-primary">{item.question.question}</p>
        </div>
        {expanded ? (
          <ChevronUp size={16} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
        ) : (
          <ChevronDown size={16} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2">
          <p className="whitespace-pre-wrap text-sm text-text-primary">{item.question.question}</p>
          <div className="flex flex-col gap-1.5 rounded-sm bg-accent-soft p-3">
            <p className="whitespace-pre-wrap text-sm text-text-primary">{item.question.answer}</p>
            {item.question.memo && (
              <p className="whitespace-pre-wrap text-xs text-text-secondary">{item.question.memo}</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
