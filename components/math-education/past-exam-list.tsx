"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ListChecks, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { categoryPath, categoryTargets, matchesCategories, PAST_EXAMS_PATH, PAST_EXAM_PRACTICE_PATH, EMPTY_CATEGORY_SELECTION, type CategorySelection } from "@/lib/past-exams";
import { createPastExamPractice, orderPracticeIds } from "@/lib/past-exam-practice";
import { PastExamCategoryFilters } from "./past-exam-category-filters";
import { ProblemRow } from "@/components/math/problem-row";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { CategoryPicker, usePastExamCategories, pastExamErrorMessage } from "./past-exam-shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function PastExamList() {
  const categories = usePastExamCategories();
  const cache = useQueryClient();
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [selection, setSelection] = useState<CategorySelection>(EMPTY_CATEGORY_SELECTION);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const problems = useQuery({ queryKey: ["past-exams"], queryFn: async () => {
    const { data, error } = await createClient().from("past_exam_problems")
      .select("id, category_id, title, keywords, year, problem_number").order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }});
  const targets = categoryTargets(categories.data ?? [], selection);
  const items = (problems.data ?? []).filter((item) =>
    matchesCategories(categories.data ?? [], item.category_id, targets) &&
    `${item.title} ${(item.keywords ?? []).join(" ")} ${item.year ?? ""} ${item.problem_number}`.toLocaleLowerCase().includes(debouncedSearch.trim().toLocaleLowerCase()));
  function changeFilters(next: CategorySelection) {
    setSelection(next); setPage(0); setSelectedIds(new Set());
  }
  async function practice(selectedOnly: boolean) {
    if (starting) return;
    const ids = selectedOnly ? [...selectedIds] : items.map((item) => item.id);
    if (!ids.length) return;
    setStarting(true); setError("");
    try {
      const id = await createPastExamPractice(createClient(), orderPracticeIds(ids, "all", true), targets);
      router.push(`${PAST_EXAM_PRACTICE_PATH}/${id}`);
    } catch (error) { setError(pastExamErrorMessage(error)); }
    finally { setStarting(false); }
  }
  async function rename(id: string, name: string) {
    if (!name.trim()) return;
    setSaving(true); setError("");
    try {
      const { error } = await createClient().from("past_exam_categories").update({ name: name.trim() }).eq("id", id);
      if (error) throw error;
      await cache.invalidateQueries({ queryKey: ["past-exam-categories"] });
    } catch { setError("분류를 수정하지 못했습니다. 다시 시도해 주세요."); }
    finally { setSaving(false); }
  }
  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">문제 목록</h2><p className="mt-1 font-mono text-xs text-text-secondary">전체 {items.length}개</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setManaging(!managing)}>분류 수정</Button>
        <Button variant={selectionMode ? "secondary" : "ghost"} onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}>{selectionMode ? <X size={15} /> : <ListChecks size={15} />}{selectionMode ? "선택 취소" : "문제 선택"}</Button>
        <Link className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm text-bg" href={`${PAST_EXAMS_PATH}/new`}><Plus size={15} />문제 등록</Link></div>
    </div>
    {(categories.error || problems.error) ? <div className="flex flex-col items-start gap-3"><EmptyState title="문제를 불러오지 못했습니다" description={pastExamErrorMessage(categories.error ?? problems.error)} /><Button variant="secondary" onClick={() => { void categories.refetch(); void problems.refetch(); }}>다시 불러오기</Button></div> :
      categories.isLoading || problems.isLoading ? <p>불러오는 중...</p> : <>
        {managing && <Card className="flex flex-col gap-2">
          <p className="text-sm text-text-secondary">수정할 분류를 선택하고 이름을 변경하세요. 기존 문제에도 반영됩니다.</p>
          <CategoryPicker categories={categories.data ?? []} value={category} onChange={(id) => { setCategory(id); setPage(0); }} />
          {category && <form key={`${category}-${categories.data?.find((item) => item.id === category)?.name}`} className="flex gap-2" onSubmit={(event) => {
            event.preventDefault(); void rename(category, String(new FormData(event.currentTarget).get("name") ?? ""));
          }}><Input name="name" aria-label="분류 이름" required defaultValue={categories.data?.find((item) => item.id === category)?.name} /><Button disabled={saving}>저장</Button></form>}
        </Card>}
        <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" /><Input className="pl-9" aria-label="문제 검색" placeholder="제목, 키워드, 연도, 문제번호 검색" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); setSelectedIds(new Set()); }} /></div>
        <PastExamCategoryFilters categories={categories.data ?? []} value={selection} onChange={changeFilters} />
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-text-secondary">{targets.length ? "선택한 분류" : "전체 분류"} · {items.length}문제</p><Button variant="secondary" disabled={!items.length || starting} onClick={() => practice(false)}>이 조건으로 연습</Button></div>
        {!items.length && <EmptyState title="등록된 문제가 없습니다" description="분류는 준비되어 있습니다. ‘문제 등록’에서 실제 문제를 추가해 주세요. 검색 중이라면 검색어나 분류를 변경해 보세요." />}
        <div className="flex flex-col gap-2">{items.slice(page * 24, (page + 1) * 24).map((item) => {
          const path = categoryPath(categories.data ?? [], item.category_id);
          return <ProblemRow key={item.id} basePath={PAST_EXAMS_PATH} showProgress={false} onToggleFavorite={async () => {}}
            selectionMode={selectionMode} selected={selectedIds.has(item.id)} onToggleSelect={(id) => setSelectedIds((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
            problem={{ id: item.id, title: item.title, problem_number: item.problem_number, is_favorite: false, current_status: null,
              subjectName: path[0]?.name ?? "미분류", subjectOrderIndex: path[0]?.order_index ?? 0, topicName: path.slice(1).map((part) => part.name).join(" / ") }} />;
        })}</div>
        {items.length > 24 && <div className="flex items-center justify-center gap-3"><Button disabled={!page} onClick={() => setPage(page - 1)}>이전</Button><span>{page + 1} / {Math.ceil(items.length / 24)}</span><Button disabled={(page + 1) * 24 >= items.length} onClick={() => setPage(page + 1)}>다음</Button></div>}
      </>}
    {selectionMode && <div className="sticky bottom-20 flex flex-wrap items-center justify-center gap-3 rounded-sm border border-border bg-surface p-3 md:bottom-4"><span className="text-sm">{selectedIds.size}개 선택</span><Button disabled={!selectedIds.size || starting} onClick={() => practice(true)}>{starting ? "시작하는 중..." : "선택한 문제로 연습"}</Button></div>}
    {error && <p role="alert" className="text-sm text-status-unknown">{error}</p>}
  </div>;
}
