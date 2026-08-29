"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ArrowLeft, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchConceptSessionWithItems,
  markAnswered,
  type ConceptSessionItem,
} from "@/lib/concept-session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { MindmapDomain } from "@/types/database";

const BASE_PATH: Record<MindmapDomain, string> = {
  pedagogy: "/pedagogy",
  math_education: "/math-education",
};

export function ConceptPracticeSession({
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

  const [index, setIndex] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const currentIndex = (() => {
    if (index !== null) return index;
    if (!data) return 0;
    const firstUnanswered = data.items.findIndex((i) => !i.answered_at);
    return firstUnanswered === -1 ? Math.max(0, data.items.length - 1) : firstUnanswered;
  })();

  async function handleCheck(item: ConceptSessionItem) {
    setShowAnswer(true);
    if (!item.answered_at) {
      const now = await markAnswered(supabase, item.id);
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchConceptSessionWithItems>> | undefined>(
        queryKey,
        (prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((i) => (i.id === item.id ? { ...i, answered_at: now } : i)),
              }
            : prev
      );
    }
  }

  function goTo(next: number) {
    setIndex(next);
    setShowAnswer(false);
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      const now = new Date().toISOString();
      await supabase.from("study_sessions").update({ ended_at: now }).eq("id", sessionId);
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchConceptSessionWithItems>> | undefined>(
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
    return <EmptyState title="문제가 없는 세션입니다" description="설정 화면에서 다시 시작해 주세요." />;
  }

  if (session.ended_at) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">연습 완료</h2>
          <p className="mt-1 text-sm text-text-secondary">총 {items.length}문제를 확인했습니다.</p>
        </div>
        <Link
          href={`${basePath}/practice`}
          className="inline-flex w-fit items-center gap-1.5 min-h-10 rounded-sm bg-accent px-3.5 py-2 text-sm font-medium text-bg transition-colors hover:opacity-90"
        >
          새 연습 시작하기
        </Link>
      </div>
    );
  }

  const item = items[currentIndex];
  const isLast = currentIndex === items.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href={`${basePath}/practice`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          연습 설정으로
        </Link>
        <span className="font-mono text-xs text-text-secondary">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      <Card className="flex flex-col gap-3">
        <p className="text-xs text-text-secondary">
          {item.question.mindmap_nodes.mindmap_topics.name} · {item.question.mindmap_nodes.name}
        </p>
        <p className="whitespace-pre-wrap text-base text-text-primary">{item.question.question}</p>

        {!showAnswer ? (
          <Button type="button" variant="secondary" className="self-start" onClick={() => handleCheck(item)}>
            <ChevronDown size={15} strokeWidth={1.75} />
            해설 보기
          </Button>
        ) : (
          <div className="flex flex-col gap-1.5 rounded-sm bg-accent-soft p-3">
            <p className="whitespace-pre-wrap text-sm text-text-primary">{item.question.answer}</p>
            {item.question.memo && (
              <p className="whitespace-pre-wrap text-xs text-text-secondary">{item.question.memo}</p>
            )}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={currentIndex === 0}
          onClick={() => goTo(currentIndex - 1)}
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
          이전 문제
        </Button>
        {isLast ? (
          <Button type="button" onClick={handleFinish} disabled={finishing}>
            {finishing ? "종료하는 중..." : "완료"}
          </Button>
        ) : (
          <Button type="button" onClick={() => goTo(currentIndex + 1)}>
            다음 문제
            <ChevronRight size={16} strokeWidth={1.75} />
          </Button>
        )}
      </div>
    </div>
  );
}
