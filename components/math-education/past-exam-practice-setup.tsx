"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { categoryTargets, EMPTY_CATEGORY_SELECTION, matchesCategories, matchesKeywords, matchesYearRange, sortPastExamProblems, PAST_EXAM_PRACTICE_PATH, type CategorySelection } from "@/lib/past-exams";
import { PastExamKeywordFilters } from "./past-exam-keyword-filters";
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
  const [keywords, setKeywords] = useState<string[]>([]);
  const [count, setCount] = useState("all");
  const [random, setRandom] = useState(false);
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const problems = useQuery({ queryKey: ["past-exam-practice-candidates"], queryFn: async () => {
    const { data, error } = await createClient().from("past_exam_problems").select("id, category_id, keywords, year, problem_number, title")
      .order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }});
  const targets = categoryTargets(categories.data ?? [], selection);
  const yearRange = { from: fromYear ? Number(fromYear) : null, to: toYear ? Number(toYear) : null };
  const invalidYears = yearRange.from !== null && yearRange.to !== null && yearRange.from > yearRange.to;
  const years = [...new Set((problems.data ?? []).flatMap((problem) => problem.year === null ? [] : [problem.year]))].sort((a, b) => a - b);
  const candidates = sortPastExamProblems((problems.data ?? []).filter((problem) => matchesCategories(categories.data ?? [], problem.category_id, targets)
    && matchesKeywords(problem.keywords ?? [], keywords) && matchesYearRange(problem.year, yearRange)), categories.data ?? []);
  const invalidCount = count !== "all" && (!Number.isInteger(Number(count)) || Number(count) < 1);
  async function start() {
    if (starting || invalidCount || invalidYears || !candidates.length) return;
    setStarting(true); setError("");
    try {
      const ids = orderPracticeIds(candidates.map((item) => item.id), count === "all" ? "all" : Number(count), random);
      const id = await createPastExamPractice(createClient(), ids, targets, keywords, yearRange);
      router.push(`${PAST_EXAM_PRACTICE_PATH}/${id}`);
    } catch (error) { setError(pastExamErrorMessage(error)); }
    finally { setStarting(false); }
  }
  return <div className="flex flex-col gap-4">
    <h2 className="text-lg font-semibold">문제 연습</h2>
    <p className="text-sm text-text-secondary">등록된 문제를 분류와 키워드별로 연습하세요. 아무 조건도 선택하지 않으면 전체 문제로 연습합니다.</p>
    {categories.error || problems.error ? <p role="alert">{pastExamErrorMessage(categories.error ?? problems.error)}</p> :
      categories.isLoading || problems.isLoading ? <p>불러오는 중...</p> : <Card className="flex flex-col gap-4">
        <fieldset disabled={starting} className="flex min-w-0 flex-col gap-4">
          <PastExamCategoryFilters categories={categories.data ?? []} value={selection} onChange={setSelection} />
          <PastExamKeywordFilters keywords={(problems.data ?? []).flatMap((problem) => problem.keywords ?? [])} selected={keywords} onChange={setKeywords} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">시작 연도<Select value={fromYear} onChange={(event) => setFromYear(event.target.value)}><option value="">제한 없음</option>{years.map((year) => <option key={year} value={year}>{year}년부터</option>)}</Select></label>
            <label className="flex flex-col gap-1 text-sm">종료 연도<Select value={toYear} onChange={(event) => setToYear(event.target.value)}><option value="">제한 없음</option>{years.map((year) => <option key={year} value={year}>{year}년까지</option>)}</Select></label>
          </div>
          {invalidYears && <p role="alert" className="text-sm text-status-unknown">시작 연도는 종료 연도보다 늦을 수 없습니다.</p>}
          <p className="text-sm">선택한 조건의 문제: {candidates.length}개</p>
          <label className="flex flex-col gap-1 text-sm">문제 수<Select value={count === "all" ? "all" : "custom"} onChange={(event) => setCount(event.target.value === "all" ? "all" : "10")}><option value="all">전체</option><option value="custom">직접 지정</option></Select></label>
          {count !== "all" && <Input aria-label="연습 문제 수" type="number" min={1} step={1} value={count} onChange={(event) => setCount(event.target.value)} />}
          {count !== "all" && Number(count) > candidates.length && <p className="text-xs text-text-secondary">등록된 {candidates.length}문제로 연습합니다.</p>}
          <label className="flex flex-col gap-1 text-sm">출제 순서<Select value={random ? "random" : "ordered"} onChange={(event) => setRandom(event.target.value === "random")}><option value="ordered">분류 → 연도 → 문제번호 순</option><option value="random">무작위</option></Select></label>
          <p className="text-xs text-text-secondary">분류는 지정한 순서대로, 연도는 오래된 순서부터, 문제번호는 작은 번호부터 정렬합니다. 연도 범위는 시작·종료 연도를 모두 포함합니다.</p>
          {!candidates.length && !invalidYears && <p className="text-sm text-text-secondary">선택한 조건에 등록된 문제가 없습니다. 분류·키워드·연도 범위를 변경해 주세요.</p>}
          <Button onClick={start} disabled={invalidCount || invalidYears || !candidates.length}>{starting ? "시작하는 중..." : "연습 시작"}</Button>
        </fieldset>
      </Card>}
    {error && <p role="alert" className="text-sm text-status-unknown">{error}</p>}
  </div>;
}
