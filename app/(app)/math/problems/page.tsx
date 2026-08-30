"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight, ListChecks, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProblemFilters, type ProblemFiltersState } from "@/components/math/problem-filters";
import { ProblemRow, type ProblemListItem } from "@/components/math/problem-row";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { createStudySession } from "@/lib/study-session";

const PAGE_SIZE = 24;

const DEFAULT_FILTERS: ProblemFiltersState = {
  subjectIds: [],
  topicIds: [],
  statuses: [],
  tagIds: [],
  favoriteOnly: false,
  search: "",
};

interface ProblemQueryRow {
  id: string;
  title: string;
  is_favorite: boolean;
  current_status: ProblemListItem["current_status"];
  problem_number: string | null;
  math_topics: {
    id: string;
    name: string;
    subject_id: string;
    math_subjects: { id: string; name: string; order_index: number };
  };
}

export default function ProblemsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [filters, setFilters] = useState<ProblemFiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startingSession, setStartingSession] = useState(false);

  const queryKey = [
    "math-problems",
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
      const hasTagFilter = filters.tagIds.length > 0;
      const selectCols =
        "id, title, is_favorite, current_status, problem_number," +
        " math_topics!inner(id, name, subject_id, math_subjects!inner(id, name, order_index))" +
        (hasTagFilter ? ", problem_tags!inner(tag_id)" : "");

      // 기본 정렬은 "과목순 -> 제목순 -> 문제번호순"인데, PostgREST는 두 단계 이상
      // 중첩된 참조 테이블 정렬(order=a(b(c)))을 지원하지 않아(400 파싱 에러 확인함)
      // 필터에 맞는 전체 목록을 가져와 클라이언트에서 직접 정렬/페이지네이션합니다.
      let query = supabase.from("math_problems").select(selectCols, { count: "exact" });

      if (debouncedSearch) query = query.ilike("title", `%${debouncedSearch}%`);
      if (filters.favoriteOnly) query = query.eq("is_favorite", true);

      if (filters.statuses.length > 0) {
        const concreteStatuses = filters.statuses.filter((s) => s !== "none");
        const includeNone = filters.statuses.includes("none");
        const orParts: string[] = [];
        if (includeNone) orParts.push("current_status.is.null");
        if (concreteStatuses.length > 0) orParts.push(`current_status.in.(${concreteStatuses.join(",")})`);
        query = query.or(orParts.join(","));
      }
      if (filters.subjectIds.length > 0) query = query.in("math_topics.subject_id", filters.subjectIds);
      if (filters.topicIds.length > 0) query = query.in("topic_id", filters.topicIds);
      if (hasTagFilter) query = query.in("problem_tags.tag_id", filters.tagIds);

      const { data, error } = await query.returns<ProblemQueryRow[]>();
      if (error) throw error;

      const rows = [...(data ?? [])].sort((a, b) => {
        const subjectDiff = a.math_topics.math_subjects.order_index - b.math_topics.math_subjects.order_index;
        if (subjectDiff !== 0) return subjectDiff;
        const titleDiff = a.title.localeCompare(b.title, "ko");
        if (titleDiff !== 0) return titleDiff;
        return (a.problem_number ?? "").localeCompare(b.problem_number ?? "", "ko");
      });
      const total = rows.length;
      const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

      const items: ProblemListItem[] = pageRows.map((row) => ({
        id: row.id,
        title: row.title,
        is_favorite: row.is_favorite,
        current_status: row.current_status,
        problem_number: row.problem_number,
        subjectName: row.math_topics.math_subjects.name,
        subjectOrderIndex: row.math_topics.math_subjects.order_index,
        topicName: row.math_topics.name,
      }));

      return { items, total };
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
    await supabase.from("math_problems").update({ is_favorite: next }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["math-problem", id] });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function handleStartSelectedPractice() {
    if (selectedIds.size === 0) return;
    setStartingSession(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const sessionId = await createStudySession(supabase, {
        userId: user.id,
        mode: "practice",
        problemIds: Array.from(selectedIds),
        filters: { subjectIds: [], topicIds: [], statuses: [] },
        order: "random",
        timeLimitSeconds: null,
      });
      router.push(`/math/practice/${sessionId}`);
    } finally {
      setStartingSession(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">문제 목록</h2>
          {data && (
            <p className="mt-1 font-mono text-xs text-text-secondary">전체 {data.total}개</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant={selectionMode ? "secondary" : "ghost"}
            onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
          >
            {selectionMode ? (
              <>
                <X size={15} strokeWidth={1.75} />
                선택 취소
              </>
            ) : (
              <>
                <ListChecks size={15} strokeWidth={1.75} />
                문제 선택
              </>
            )}
          </Button>
          <Link
            href="/math/problems/new"
            className="inline-flex items-center justify-center gap-2 min-h-10 rounded-sm bg-accent px-3.5 py-2 text-sm font-medium text-bg transition-colors hover:opacity-90"
          >
            <Plus size={15} strokeWidth={1.75} />
            문제 등록
          </Link>
        </div>
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
          title="문제를 불러오지 못했습니다"
          description="네트워크 상태를 확인하고 새로고침해 주세요."
        />
      ) : isLoading ? (
        <p className="text-sm text-text-secondary">불러오는 중...</p>
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 문제가 없습니다"
          description="필터를 조정하거나 새 문제를 등록해 보세요."
        />
      ) : (
        <div className={`flex flex-col gap-2 ${isPlaceholderData ? "opacity-60" : ""}`}>
          {data?.items.map((problem) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              onToggleFavorite={handleToggleFavorite}
              selectionMode={selectionMode}
              selected={selectedIds.has(problem.id)}
              onToggleSelect={toggleSelect}
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

      {selectionMode && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-4 md:bottom-4">
          <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-2.5 shadow-subtle">
            <span className="font-mono text-sm text-text-primary">{selectedIds.size}개 선택됨</span>
            <Button
              type="button"
              onClick={handleStartSelectedPractice}
              disabled={selectedIds.size === 0 || startingSession}
            >
              {startingSession ? "시작하는 중..." : "선택한 문제로 연습"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
