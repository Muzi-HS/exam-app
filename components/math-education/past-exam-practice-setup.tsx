"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { categoryTargets, EMPTY_CATEGORY_SELECTION, matchesCategories, PAST_EXAM_PRACTICE_PATH, type CategorySelection } from "@/lib/past-exams";
import { createPastExamPractice, orderPracticeIds } from "@/lib/past-exam-practice";
import { usePastExamCategories, pastExamErrorMessage } from "./past-exam-shared";
import { PastExamCategoryFilters } from "./past-exam-category-filters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function PastExamPracticeSetup() {
  const router = useRouter();
  const categories = usePastExamCategories();
  const [selection, setSelection] = useState<CategorySelection>(EMPTY_CATEGORY_SELECTION);
  const [count, setCount] = useState("all");
  const [random, setRandom] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const problems = useQuery({ queryKey: ["past-exam-practice-candidates"], queryFn: async () => {
    const { data, error } = await createClient().from("past_exam_problems").select("id, category_id")
      .order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }});
  const targets = categoryTargets(categories.data ?? [], selection);
  const candidates = (problems.data ?? []).filter((problem) => matchesCategories(categories.data ?? [], problem.category_id, targets));
  const invalidCount = count !== "all" && (!Number.isInteger(Number(count)) || Number(count) < 1);
  async function start() {
    if (starting || invalidCount || !candidates.length) return;
    setStarting(true); setError("");
    try {
      const ids = orderPracticeIds(candidates.map((item) => item.id), count === "all" ? "all" : Number(count), random);
      const id = await createPastExamPractice(createClient(), ids, targets);
      router.push(`${PAST_EXAM_PRACTICE_PATH}/${id}`);
    } catch (error) { setError(pastExamErrorMessage(error)); }
    finally { setStarting(false); }
  }
  return <div className="flex flex-col gap-4">
    <h2 className="text-lg font-semibold">기출문제 연습</h2>
    <p className="text-sm text-text-secondary">기출문제에 등록한 문제를 한 문제씩 풀고 해설을 확인하세요. 분류를 선택하지 않으면 전체 문제로 연습합니다.</p>
    {categories.error || problems.error ? <p role="alert">{pastExamErrorMessage(categories.error ?? problems.error)}</p> :
      categories.isLoading || problems.isLoading ? <p>불러오는 중...</p> : <Card className="flex flex-col gap-4">
        <fieldset disabled={starting} className="flex min-w-0 flex-col gap-4">
          <PastExamCategoryFilters categories={categories.data ?? []} value={selection} onChange={setSelection} />
          <p className="text-sm">선택한 분류의 문제: {candidates.length}개</p>
          <label className="flex flex-col gap-1 text-sm">문제 수<Select value={count === "all" ? "all" : "custom"} onChange={(event) => setCount(event.target.value === "all" ? "all" : "10")}><option value="all">전체</option><option value="custom">직접 지정</option></Select></label>
          {count !== "all" && <Input aria-label="연습 문제 수" type="number" min={1} step={1} value={count} onChange={(event) => setCount(event.target.value)} />}
          {count !== "all" && Number(count) > candidates.length && <p className="text-xs text-text-secondary">등록된 {candidates.length}문제로 연습합니다.</p>}
          <label className="flex flex-col gap-1 text-sm">출제 순서<Select value={random ? "random" : "ordered"} onChange={(event) => setRandom(event.target.value === "random")}><option value="random">무작위</option><option value="ordered">목록 순서</option></Select></label>
          {!candidates.length && <p className="text-sm text-text-secondary">선택한 분류에 등록된 문제가 없습니다. 기출문제에서 문제를 추가하거나 분류를 변경해 주세요.</p>}
          <Button onClick={start} disabled={invalidCount || !candidates.length}>{starting ? "시작하는 중..." : "연습 시작"}</Button>
        </fieldset>
      </Card>}
    {error && <p role="alert" className="text-sm text-status-unknown">{error}</p>}
  </div>;
}
