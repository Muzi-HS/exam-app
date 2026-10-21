"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { fetchPastExamPractice } from "@/lib/past-exam-practice";
import { categoryPath, PAST_EXAM_PRACTICE_PATH } from "@/lib/past-exams";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import { usePastExamCategories, pastExamErrorMessage } from "./past-exam-shared";
import { ProblemImageViewer } from "@/components/math/problem-image-viewer";
import { StatusSelector } from "@/components/math/status-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { renderMath } from "@/lib/math-render";
import type { ProblemStatus } from "@/types/database";

export function PastExamPracticeSession({ id }: { id: string }) {
  const supabase = createClient();
  const cache = useQueryClient();
  const categories = usePastExamCategories();
  const key = ["past-exam-practice", id];
  const query = useQuery({ queryKey: key, queryFn: () => fetchPastExamPractice(supabase, id) });
  const [index, setIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const currentIndex = Math.min(index ?? Math.max(0, query.data?.items.findIndex((item) => !item.answered_at) ?? 0), Math.max(0, (query.data?.items.length ?? 1) - 1));
  async function rate(status: ProblemStatus) {
    const item = query.data?.items[currentIndex];
    if (!item || saving) return;
    setSaving(true); setError("");
    try {
      const answered_at = new Date().toISOString();
      const { error } = await supabase.from("study_session_items").update({ self_rating: status, answered_at }).eq("id", item.id).select("id").single();
      if (error) throw error;
      // Keep the current problem visible after recording its rating.
      setIndex(currentIndex);
      cache.setQueryData<Awaited<ReturnType<typeof fetchPastExamPractice>>>(key, (previous) => previous ? {
        ...previous, items: previous.items.map((entry) => entry.id === item.id ? { ...entry, self_rating: status, answered_at } : entry),
      } : previous);
    } catch (error) { setError(pastExamErrorMessage(error)); }
    finally { setSaving(false); }
  }
  async function finish() {
    setSaving(true); setError("");
    try {
      const { error } = await supabase.from("study_sessions").update({ ended_at: new Date().toISOString() }).eq("id", id).select("id").single();
      if (error) throw error;
      await cache.invalidateQueries({ queryKey: key });
    } catch (error) { setError(pastExamErrorMessage(error)); }
    finally { setSaving(false); }
  }
  if (query.error) return <div className="flex flex-col gap-3"><p role="alert">{pastExamErrorMessage(query.error)}</p><Link href={PAST_EXAM_PRACTICE_PATH}>연습 설정으로</Link></div>;
  if (!query.data) return <p>불러오는 중...</p>;
  const { items, session, missingCount } = query.data;
  const answered = items.filter((item) => item.answered_at).length;
  if (session.ended_at) return <Card className="flex flex-col gap-3"><h2 className="text-lg font-semibold">연습 완료</h2><p>전체 {items.length}문제 중 {answered}문제의 이해도를 기록했습니다.</p><Link className="text-accent" href={PAST_EXAM_PRACTICE_PATH}>새 연습 시작</Link></Card>;
  const item = items[Math.min(currentIndex, items.length - 1)];
  if (!item) return <div><p>연습할 문제가 없습니다. 등록한 문제가 삭제되었을 수 있습니다.</p><Link href={PAST_EXAM_PRACTICE_PATH}>연습 설정으로</Link></div>;
  const problem = item.problem;
  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><Link href={PAST_EXAM_PRACTICE_PATH} className="text-sm text-accent">← 연습 설정</Link><span className="text-xs text-text-secondary">{currentIndex + 1} / {items.length} · 기록 {answered}개</span></div>
    {missingCount > 0 && <p className="text-xs text-text-secondary">삭제된 문제 {missingCount}개를 제외했습니다.</p>}
    <h2 className="text-lg font-semibold">{problem.title}{problem.problem_number && ` · ${problem.problem_number}번`}</h2>
    <p className="text-xs text-text-secondary">{categoryPath(categories.data ?? [], problem.category_id).map((part) => part.name).join(" / ")}</p>
    <ProblemImageViewer key={item.id} problemContent={problem.content} solutionContent={problem.solution_content}
      problemImages={problem.problem_images.map((path) => ({ id: path, url: getPublicImageUrl(supabase, path) }))}
      solutionImages={problem.solution_images.map((path) => ({ id: path, url: getPublicImageUrl(supabase, path) }))} />
    {problem.memo && <details className="rounded-sm border border-border p-3"><summary className="cursor-pointer text-sm">메모 보기</summary><div className="mt-2 whitespace-pre-wrap text-sm">{renderMath(problem.memo)}</div></details>}
    {/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(problem.youtube_url) && <a className="text-sm text-accent" href={problem.youtube_url} target="_blank" rel="noopener noreferrer">유튜브 해설 보기</a>}
    <Card className="flex flex-col gap-2"><p className="text-sm text-text-secondary">이번 문제의 이해도</p><StatusSelector status={item.self_rating} onChange={rate} disabled={saving} /></Card>
    {error && <p role="alert" className="text-sm text-status-unknown">{error}</p>}
    <div className="flex flex-wrap justify-between gap-2"><Button variant="secondary" disabled={saving || currentIndex === 0} onClick={() => setIndex(currentIndex - 1)}>이전</Button>
      <Button variant="secondary" disabled={saving} onClick={finish}>연습 종료</Button><Button disabled={saving} onClick={() => currentIndex >= items.length - 1 ? finish() : setIndex(currentIndex + 1)}>{currentIndex >= items.length - 1 ? "연습 완료" : "다음"}</Button></div>
  </div>;
}
