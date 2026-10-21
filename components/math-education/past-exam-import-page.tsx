"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { importBundleSchema, importProblemBundle, type ProblemImportBundle } from "@/lib/past-exam-import";
import { PAST_EXAMS_PATH } from "@/lib/past-exams";
import { pastExamErrorMessage } from "./past-exam-shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PastExamImportPage() {
  const cache = useQueryClient();
  const [bundle, setBundle] = useState<ProblemImportBundle | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  async function start() {
    if (!bundle || busy) return;
    setBusy(true); setError("");
    try {
      const result = await importProblemBundle(createClient(), bundle, (done, total, skipped) => setProgress(`${done} / ${total}문제 처리 · 기존 ${skipped}개 건너뜀`));
      setProgress(`등록 완료: 새 문제 ${result.added}개 · 기존 문제 ${result.skipped}개`);
      setComplete(true);
    } catch (error) { setError(pastExamErrorMessage(error)); }
    finally {
      await Promise.all([cache.invalidateQueries({ queryKey: ["past-exams"] }), cache.invalidateQueries({ queryKey: ["past-exam-categories"] }), cache.invalidateQueries({ queryKey: ["past-exam-practice-candidates"] })]);
      setBusy(false);
    }
  }
  return <div className="flex flex-col gap-4"><Link className="text-sm text-accent" href={PAST_EXAMS_PATH}>← 문제 목록</Link><h2 className="text-lg font-semibold">문제 일괄 등록</h2>
    <Card className="flex flex-col gap-3"><p className="text-sm">이미지와 분류 정보가 담긴 등록용 JSON 파일을 선택하세요. 같은 등록 파일을 다시 실행해도 이미 등록된 문제는 건너뜁니다.</p>
      <input aria-label="문제 등록 파일" type="file" accept=".json" disabled={busy} onChange={async (event) => {
        const file = event.target.files?.[0]; setBundle(null); setError(""); setComplete(false); setProgress("");
        if (!file) return;
        if (file.size > 200 * 1024 * 1024) { setError("200MB 이하의 파일을 선택해 주세요."); return; }
        setBusy(true);
        try { setBundle(importBundleSchema.parse(JSON.parse(await file.text()))); }
        catch { setError("등록 파일 형식이 올바르지 않습니다."); }
        finally { setBusy(false); }
      }} />
      {bundle && <><p className="text-sm">문제 {bundle.problems.length}개 · 이미지 {bundle.problems.reduce((sum, problem) => sum + problem.problem_images.length + problem.solution_images.length, 0)}장</p>
        <div className="max-h-64 overflow-auto text-xs">{bundle.problems.map((problem) => <p key={problem.id} className="py-1">{problem.title} · 번호 {problem.problem_number} · {problem.keywords.join(", ")}</p>)}</div>
        <Button disabled={busy || complete} onClick={start}>{busy ? "등록 중..." : complete ? "등록 완료" : "일괄 등록 시작"}</Button></>}
      {progress && <p role="status" className="text-sm">{progress}</p>}
      {busy && <p className="text-xs text-text-secondary">등록이 끝날 때까지 이 화면을 열어 두세요. 중단되면 같은 파일로 다시 시작할 수 있습니다.</p>}
      {error && <p role="alert" className="text-sm text-status-unknown">{error}</p>}
    </Card></div>;
}
