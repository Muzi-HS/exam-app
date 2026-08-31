"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProblemFilters, type ProblemFiltersState } from "@/components/math/problem-filters";
import { ProblemRow, type ProblemListItem } from "@/components/math/problem-row";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { setFavorite, setWrongAnswer } from "@/lib/problem-progress";
import { fetchMathProblemsPage } from "@/lib/math-problems";

const PAGE_SIZE = 24;

const DEFAULT_FILTERS: ProblemFiltersState = {
  subjectIds: [],
  topicIds: [],
  statuses: [],
  tagIds: [],
  favoriteOnly: false,
  search: "",
};

export default function WrongAnswersPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ProblemFiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const queryKey = [
    "wrong-answers",
    filters.subjectIds.join(","),
    filters.topicIds.join(","),
    filters.statuses.join(","),
    filters.tagIds.join(","),
    filters.favoriteOnly,
    debouncedSearch,
    page,
  ];

  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { items: [], total: 0 };

      return fetchMathProblemsPage(
        supabase,
        user.id,
        { ...filters, search: debouncedSearch, wrongOnly: true },
        page,
        PAGE_SIZE
      );
    },
    placeholderData: (prev) => prev,
  });

  async function handleToggleFavorite(id: string, next: boolean) {
    queryClient.setQueryData<{ items: ProblemListItem[]; total: number } | undefined>(
      queryKey,
      (prev) =>
        prev
          ? { ...prev, items: prev.items.map((p) => (p.id === id ? { ...p, is_favorite: next } : p)) }
          : prev
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await setFavorite(supabase, user.id, id, next);
    queryClient.invalidateQueries({ queryKey: ["math-problem", id] });
  }

  async function handleRelease(id: string) {
    queryClient.setQueryData<{ items: ProblemListItem[]; total: number } | undefined>(
      queryKey,
      (prev) =>
        prev
          ? { ...prev, items: prev.items.filter((p) => p.id !== id), total: Math.max(0, prev.total - 1) }
          : prev
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await setWrongAnswer(supabase, user.id, id, false, null);
    queryClient.invalidateQueries({ queryKey: ["math-problem", id] });
    queryClient.invalidateQueries({ queryKey: ["math-problems"] });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">오답노트</h2>
        <p className="mt-1 text-sm text-text-secondary">
          시험에서 틀림으로 표시한 문제입니다. 문제 목록과 동일하게 분류해서 볼 수 있습니다.
        </p>
        {data && <p className="mt-1 font-mono text-xs text-text-secondary">전체 {data.total}개</p>}
      </div>

      <ProblemFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(0);
        }}
      />

      {error ? (
        <EmptyState
          title="오답노트를 불러오지 못했습니다"
          description="네트워크 상태를 확인하고 새로고침해 주세요."
        />
      ) : isLoading ? (
        <p className="text-sm text-text-secondary">불러오는 중...</p>
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title="오답노트가 비어 있습니다"
          description="시험 결과 화면에서 문제를 틀림으로 표시하면 여기에 모입니다."
        />
      ) : (
        <div className={`flex flex-col gap-2 ${isPlaceholderData ? "opacity-60" : ""}`}>
          {data?.items.map((problem) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              onToggleFavorite={handleToggleFavorite}
              onRelease={handleRelease}
            />
          ))}
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </Button>
          <span className="font-mono text-xs text-text-secondary">
            {page + 1} / {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </Button>
        </div>
      )}
    </div>
  );
}
