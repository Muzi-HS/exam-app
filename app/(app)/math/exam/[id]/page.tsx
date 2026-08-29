"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import { fetchSessionWithItems, type SessionItem } from "@/lib/study-session";
import { formatDate, formatDuration } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProblemImageViewer } from "@/components/math/problem-image-viewer";
import { ExamResultItem } from "@/components/math/exam-result-item";
import type { ProblemStatus } from "@/types/database";

type SessionData = Awaited<ReturnType<typeof fetchSessionWithItems>>;

export default function ExamSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const supabase = createClient();
  const queryClient = useQueryClient();

  const queryKey = ["study-session", sessionId];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchSessionWithItems(supabase, sessionId),
  });

  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const finishedRef = useRef(false);

  async function handleFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinishing(true);
    try {
      const now = new Date().toISOString();
      const { error: finishError } = await supabase
        .from("study_sessions")
        .update({ ended_at: now })
        .eq("id", sessionId);
      if (finishError) throw finishError;
      queryClient.setQueryData<SessionData | undefined>(queryKey, (prev) =>
        prev ? { ...prev, session: { ...prev.session, ended_at: now } } : prev
      );
    } finally {
      setFinishing(false);
    }
  }

  const timeLimitSeconds = data?.session.time_limit_seconds ?? null;
  const startedAt = data?.session.started_at;
  const ended = !!data?.session.ended_at;

  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!timeLimitSeconds || !startedAt || ended) return;
    const deadline = new Date(startedAt).getTime() + timeLimitSeconds * 1000;

    function tick() {
      const secondsLeft = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(secondsLeft);
      if (secondsLeft <= 0) {
        handleFinish();
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLimitSeconds, startedAt, ended]);

  function handleRated(itemId: string, status: ProblemStatus, solveCount: number) {
    queryClient.setQueryData<SessionData | undefined>(queryKey, (prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    self_rating: status,
                    answered_at: new Date().toISOString(),
                    problem: { ...i.problem, solve_count: solveCount },
                  }
                : i
            ),
          }
        : prev
    );
  }

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
            {formatDate(session.started_at)} · {items.length}문제 · 소요 시간 {formatDuration(durationSeconds)}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <ExamResultItem key={item.id} item={item} index={i} onRated={handleRated} />
          ))}
        </div>
        <Link
          href="/math/exam"
          className="inline-flex w-fit items-center gap-1.5 rounded-sm bg-accent px-3.5 py-2 text-sm font-medium text-bg transition-colors hover:opacity-90"
        >
          시험 목록으로
        </Link>
      </div>
    );
  }

  return (
    <ExamProgress
      items={items}
      index={index}
      onIndexChange={setIndex}
      remaining={remaining}
      onFinish={handleFinish}
      finishing={finishing}
    />
  );
}

function ExamProgress({
  items,
  index,
  onIndexChange,
  remaining,
  onFinish,
  finishing,
}: {
  items: SessionItem[];
  index: number;
  onIndexChange: (i: number) => void;
  remaining: number | null;
  onFinish: () => void;
  finishing: boolean;
}) {
  const supabase = createClient();
  const item = items[index];

  const problemImages = useMemo(
    () =>
      (item.problem.problem_images ?? [])
        .filter((img) => img.image_type === "problem")
        .sort((a, b) => a.order_index - b.order_index)
        .map((img) => ({ id: img.id, url: getPublicImageUrl(supabase, img.storage_path) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item]
  );

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

      <Card className="flex flex-col gap-1">
        <p className="text-xs text-text-secondary">
          {item.problem.math_topics.math_subjects.name} · {item.problem.math_topics.name}
        </p>
        <h1 className="text-lg font-semibold text-text-primary">{item.problem.title}</h1>
      </Card>

      <ProblemImageViewer problemImages={problemImages} solutionImages={[]} allowSolution={false} />

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={index === 0}
          onClick={() => onIndexChange(index - 1)}
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
          이전 문제
        </Button>
        {isLast ? (
          <Button type="button" variant="danger" onClick={onFinish} disabled={finishing}>
            {finishing ? "제출하는 중..." : "시험 제출"}
          </Button>
        ) : (
          <Button type="button" onClick={() => onIndexChange(index + 1)}>
            다음 문제
            <ChevronRight size={16} strokeWidth={1.75} />
          </Button>
        )}
      </div>

      {!isLast && (
        <Button type="button" variant="ghost" className="self-center" onClick={onFinish} disabled={finishing}>
          지금 제출하고 종료
        </Button>
      )}
    </div>
  );
}
