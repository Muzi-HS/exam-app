"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FilterChipGroup } from "@/components/math/filter-chip-group";
import { SubjectTopicPicker } from "@/components/math/subject-topic-picker";
import { StatusChipGroup } from "@/components/math/status-chip-group";
import type { StatusValue } from "@/components/ui/status-icon";
import {
  fetchCandidateProblems,
  pickProblemIds,
  createStudySession,
  type DrawOrder,
  type SessionFilters,
} from "@/lib/study-session";
import { cn } from "@/lib/utils";
import type { ProblemStatus } from "@/types/database";

const STATUS_VALUES: StatusValue[] = ["unknown", "partial", "mastered"];

const COUNT_OPTIONS: { value: string; label: string }[] = [
  { value: "5", label: "5문제" },
  { value: "10", label: "10문제" },
  { value: "20", label: "20문제" },
  { value: "all", label: "전체" },
  { value: "custom", label: "직접 입력" },
];

const ORDER_OPTIONS: { value: DrawOrder; label: string }[] = [
  { value: "random", label: "랜덤" },
  { value: "stale", label: "오래 학습하지 않은 순" },
  { value: "weak", label: "이해도 낮은 순" },
];

export function SessionSetupForm({ mode }: { mode: "practice" | "exam" }) {
  const supabase = createClient();
  const router = useRouter();

  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<ProblemStatus[]>([]);
  const [count, setCount] = useState<string[]>(["10"]);
  const [customCount, setCustomCount] = useState("10");
  const [order, setOrder] = useState<DrawOrder[]>(["random"]);
  const [useTimeLimit, setUseTimeLimit] = useState(false);
  const [minutes, setMinutes] = useState("30");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters: SessionFilters = useMemo(
    () => ({ subjectIds, topicIds, statuses }),
    [subjectIds, topicIds, statuses]
  );

  const { data: candidateCount, isLoading: countLoading } = useQuery({
    queryKey: [
      "study-candidate-count",
      subjectIds.join(","),
      topicIds.join(","),
      statuses.join(","),
    ],
    queryFn: async () => (await fetchCandidateProblems(supabase, filters)).length,
  });

  async function handleStart() {
    setError(null);
    setStarting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("로그인이 필요합니다.");
        return;
      }

      const candidates = await fetchCandidateProblems(supabase, filters);
      if (candidates.length === 0) {
        setError("조건에 맞는 문제가 없습니다.");
        return;
      }

      const countValue =
        count[0] === "all"
          ? ("all" as const)
          : count[0] === "custom"
            ? Math.max(1, Number(customCount) || 0)
            : Number(count[0]);
      const drawOrder = order[0] ?? "random";
      const ids = pickProblemIds(candidates, drawOrder, countValue);
      const timeLimitSeconds =
        mode === "exam" && useTimeLimit ? Math.max(1, Number(minutes) || 0) * 60 : null;

      const sessionId = await createStudySession(supabase, {
        userId: user.id,
        mode,
        problemIds: ids,
        filters,
        order: drawOrder,
        timeLimitSeconds,
      });

      router.push(`/math/${mode}/${sessionId}`);
    } catch {
      setError("세션을 시작하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <p className="mb-1.5 text-sm text-text-secondary">범위 (과목 · 단원)</p>
        <SubjectTopicPicker
          subjectIds={subjectIds}
          topicIds={topicIds}
          onChange={(next) => {
            setSubjectIds(next.subjectIds);
            setTopicIds(next.topicIds);
          }}
        />
        {subjectIds.length === 0 && (
          <p className="mt-1 text-xs text-text-secondary">과목을 선택하지 않으면 전체 범위입니다.</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-sm text-text-secondary">이해도</p>
        <StatusChipGroup
          values={STATUS_VALUES}
          selected={statuses}
          onChange={(next) => setStatuses(next.filter((v): v is ProblemStatus => v !== "none"))}
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm text-text-secondary">문제 수</p>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChipGroup
            options={COUNT_OPTIONS}
            selected={count}
            onChange={(v) => setCount(v.length ? [v[v.length - 1]] : ["10"])}
            multiple={false}
          />
          {count[0] === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value)}
                className="w-20"
                autoFocus
              />
              <span className="text-sm text-text-secondary">문제</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm text-text-secondary">출제 방식</p>
        <FilterChipGroup
          options={ORDER_OPTIONS}
          selected={order}
          onChange={(v) => setOrder(v.length ? [v[v.length - 1]] : ["random"])}
          multiple={false}
        />
      </div>

      {mode === "exam" && (
        <div>
          <p className="mb-1.5 text-sm text-text-secondary">제한 시간</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseTimeLimit((v) => !v)}
              aria-pressed={useTimeLimit}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors",
                useTimeLimit
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-secondary hover:bg-accent-soft hover:text-text-primary"
              )}
            >
              시간 제한 사용
            </button>
            {useTimeLimit && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-text-secondary">분</span>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="font-mono text-xs text-text-secondary">
        {countLoading ? "조건에 맞는 문제 수 확인 중..." : `조건에 맞는 문제 ${candidateCount ?? 0}개`}
      </p>

      {error && <p className="text-sm text-status-unknown">{error}</p>}

      <Button
        type="button"
        onClick={handleStart}
        disabled={starting || countLoading || (candidateCount ?? 0) === 0}
      >
        {starting ? "시작하는 중..." : mode === "practice" ? "연습 시작" : "시험 시작"}
      </Button>
    </Card>
  );
}
