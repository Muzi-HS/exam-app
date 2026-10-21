"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { categoryPath, PAST_EXAMS_PATH } from "@/lib/past-exams";
import { CategoryPicker, usePastExamCategories } from "./past-exam-shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function PastExamList() {
  const categories = usePastExamCategories();
  const cache = useQueryClient();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const problems = useQuery({ queryKey: ["past-exams"], queryFn: async () => {
    const { data, error } = await createClient().from("past_exam_problems")
      .select("id, category_id, title, source, year, problem_number").order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }});
  const items = (problems.data ?? []).filter((item) =>
    (!category || categoryPath(categories.data ?? [], item.category_id).some((part) => part.id === category)) &&
    `${item.title} ${item.source} ${item.year ?? ""} ${item.problem_number}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">기출문제</h2>
      <div className="flex gap-2"><Button variant="secondary" onClick={() => setManaging(!managing)}>분류 수정</Button>
        <Link className="rounded-sm bg-accent px-4 py-2 text-sm text-bg" href={`${PAST_EXAMS_PATH}/new`}>문제 등록</Link></div>
    </div>
    {(categories.error || problems.error) ? <EmptyState title="기출문제를 불러오지 못했습니다" description="데이터베이스 마이그레이션 적용 여부와 네트워크 연결을 확인해 주세요." /> :
      categories.isLoading || problems.isLoading ? <p>불러오는 중...</p> : <>
        {managing && <Card className="flex flex-col gap-2">
          <p className="text-sm text-text-secondary">수정할 분류를 선택하고 이름을 변경하세요. 기존 문제에도 반영됩니다.</p>
          <CategoryPicker categories={categories.data ?? []} value={category} onChange={(id) => { setCategory(id); setPage(0); }} />
          {category && <form key={`${category}-${categories.data?.find((item) => item.id === category)?.name}`} className="flex gap-2" onSubmit={(event) => {
            event.preventDefault(); void rename(category, String(new FormData(event.currentTarget).get("name") ?? ""));
          }}><Input name="name" aria-label="분류 이름" required defaultValue={categories.data?.find((item) => item.id === category)?.name} /><Button disabled={saving}>저장</Button></form>}
          {error && <p role="alert" className="text-sm text-status-unknown">{error}</p>}
        </Card>}
        <CategoryPicker categories={categories.data ?? []} value={category} onChange={(id) => { setCategory(id); setPage(0); }} />
        <Input aria-label="기출문제 검색" placeholder="제목, 출처, 연도, 문제번호 검색" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
        <p className="text-xs text-text-secondary">전체 {items.length}개</p>
        {!items.length && <EmptyState title="조건에 맞는 기출문제가 없습니다" description="분류를 변경하거나 새 문제를 등록해 보세요." />}
        {items.slice(page * 24, (page + 1) * 24).map((item) => <Link key={item.id} href={`${PAST_EXAMS_PATH}/${item.id}`}>
          <Card className="flex flex-col gap-1 hover:border-accent"><p className="font-medium">{item.title}</p>
            <p className="text-xs text-text-secondary">{[item.year && `${item.year}년`, item.source, item.problem_number && `${item.problem_number}번`].filter(Boolean).join(" · ")}</p>
            <p className="text-xs text-text-secondary">{categoryPath(categories.data ?? [], item.category_id).map((part) => part.name).join(" / ")}</p>
          </Card></Link>)}
        {items.length > 24 && <div className="flex items-center justify-center gap-3"><Button disabled={!page} onClick={() => setPage(page - 1)}>이전</Button><span>{page + 1} / {Math.ceil(items.length / 24)}</span><Button disabled={(page + 1) * 24 >= items.length} onClick={() => setPage(page + 1)}>다음</Button></div>}
      </>}
  </div>;
}
