"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ArrowLeft, Youtube } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import { fetchSessionWithItems, recordProgress, type SessionItem } from "@/lib/study-session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusSelector } from "@/components/math/status-selector";
import { ProblemImageViewer } from "@/components/math/problem-image-viewer";
import { StatusIcon } from "@/components/ui/status-icon";
import type { ProblemStatus } from "@/types/database";

export default function PracticeSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const queryKey = ["study-session", sessionId];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchSessionWithItems(supabase, sessionId),
  });

  const [index, setIndex] = useState<number | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const currentIndex = useMemo(() => {
    if (index !== null) return index;
    if (!data) return 0;
    const firstUnanswered = data.items.findIndex((i) => !i.answered_at);
    return firstUnanswered === -1 ? Math.max(0, data.items.length - 1) : firstUnanswered;
  }, [index, data]);

  async function handleRate(item: SessionItem, status: ProblemStatus) {
    setStatusPending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { recordedAt, solveCount } = await recordProgress(supabase, {
        userId: user.id,
        problemId: item.item_id,
        status,
      });

      const { error: itemError } = await supabase
        .from("study_session_items")
        .update({ self_rating: status, answered_at: recordedAt })
        .eq("id", item.id);
      if (itemError) throw itemError;

      queryClient.setQueryData<Awaited<ReturnType<typeof fetchSessionWithItems>> | undefined>(
        queryKey,
        (prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((i) =>
                  i.id === item.id
                    ? {
                        ...i,
                        self_rating: status,
                        answered_at: recordedAt,
                        problem: { ...i.problem, solve_count: solveCount },
                      }
                    : i
                ),
              }
            : prev
      );
    } finally {
      setStatusPending(false);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      const now = new Date().toISOString();
      const { error: finishError } = await supabase
        .from("study_sessions")
        .update({ ended_at: now })
        .eq("id", sessionId);
      if (finishError) throw finishError;
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchSessionWithItems>> | undefined>(
        queryKey,
        (prev) => (prev ? { ...prev, session: { ...prev.session, ended_at: now } } : prev)
      );
    } finally {
      setFinishing(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-secondary">불러오는 중...</p>;
  }

  if (error || !data) {
    return (
      <EmptyState
        title="세션을 불러오지 못했습니다"
        description="삭제되었거나 접근할 수 없는 연습 세션입니다."
      />
    );
  }

  const { session, items } = data;

  if (items.length === 0) {
    return (
      <EmptyState title="문제가 없는 세션입니다" description="설정 화면에서 다시 시작해 주세요." />
    );
  }

  if (session.ended_at) {
    return <PracticeResult items={items} />;
  }

  const item = items[currentIndex];
  const problemImages = (item.problem.problem_images ?? [])
    .filter((img) => img.image_type === "problem")
    .sort((a, b) => a.order_index - b.order_index)
    .map((img) => ({ id: img.id, url: getPublicImageUrl(supabase, img.storage_path) }));
  const solutionImages = (item.problem.problem_images ?? [])
    .filter((img) => img.image_type === "solution")
    .sort((a, b) => a.order_index - b.order_index)
    .map((img) => ({ id: img.id, url: getPublicImageUrl(supabase, img.storage_path) }));

  const isLast = currentIndex === items.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href="/math/practice"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          연습 설정으로
        </Link>
        <span className="font-mono text-xs text-text-secondary">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      <Card className="flex flex-col gap-2">
        <p className="text-xs text-text-secondary">
          {item.problem.math_topics.math_subjects.name} · {item.problem.math_topics.name}
        </p>
        <h1 className="text-lg font-semibold text-text-primary">{item.problem.title}</h1>
        {item.problem.memo && (
          <p className="whitespace-pre-wrap rounded-sm bg-bg p-3 text-sm text-text-secondary">
            {item.problem.memo}
          </p>
        )}
        {item.problem.youtube_url && (
          <a
            href={item.problem.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 min-h-10 rounded-sm border border-border px-3 py-2 text-sm text-text-primary hover:bg-accent-soft"
          >
            <Youtube size={16} strokeWidth={1.75} />
            유튜브에서 보기
          </a>
        )}
      </Card>

      <ProblemImageViewer problemImages={problemImages} solutionImages={solutionImages} />

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-primary">이해도 자기 평가</p>
          <p className="font-mono text-xs text-text-secondary">푼 횟수 {item.problem.solve_count}회</p>
        </div>
        <StatusSelector
          status={item.self_rating}
          onChange={(status) => handleRate(item, status)}
          disabled={statusPending}
        />
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={currentIndex === 0}
          onClick={() => setIndex(currentIndex - 1)}
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
          이전 문제
        </Button>
        {isLast ? (
          <Button type="button" onClick={handleFinish} disabled={finishing}>
            {finishing ? "종료하는 중..." : "완료"}
          </Button>
        ) : (
          <Button type="button" onClick={() => setIndex(currentIndex + 1)}>
            다음 문제
            <ChevronRight size={16} strokeWidth={1.75} />
          </Button>
        )}
      </div>
    </div>
  );
}

function PracticeResult({ items }: { items: SessionItem[] }) {
  const counts = { unknown: 0, partial: 0, mastered: 0, none: 0 };
  for (const item of items) {
    if (item.self_rating) counts[item.self_rating]++;
    else counts.none++;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">연습 완료</h2>
        <p className="mt-1 text-sm text-text-secondary">총 {items.length}문제를 풀었습니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <StatusIcon status="unknown" size={18} filled className="text-status-unknown" />
          <p className="mt-2 font-mono text-2xl font-semibold text-status-unknown">{counts.unknown}</p>
        </Card>
        <Card>
          <StatusIcon status="partial" size={18} filled className="text-status-partial" />
          <p className="mt-2 font-mono text-2xl font-semibold text-status-partial">{counts.partial}</p>
        </Card>
        <Card>
          <StatusIcon status="mastered" size={18} filled className="text-status-mastered" />
          <p className="mt-2 font-mono text-2xl font-semibold text-status-mastered">{counts.mastered}</p>
        </Card>
        <Card>
          <StatusIcon status="none" size={18} className="text-text-secondary" />
          <p className="mt-2 font-mono text-2xl font-semibold text-text-primary">{counts.none}</p>
        </Card>
      </div>

      <Link
        href="/math/practice"
        className="inline-flex w-fit items-center gap-1.5 min-h-10 rounded-sm bg-accent px-3.5 py-2 text-sm font-medium text-bg transition-colors hover:opacity-90"
      >
        새 연습 시작하기
      </Link>
    </div>
  );
}
