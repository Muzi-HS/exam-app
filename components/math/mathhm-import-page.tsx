"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { mathhmBundleSchema, importMathhm, type MathhmBundle } from "@/lib/mathhm-import";
import { renderMath } from "@/lib/math-render";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function MathhmImportPage() {
  const cache = useQueryClient();
  const [bundle, setBundle] = useState<MathhmBundle | null>(null);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  async function start() {
    if (!bundle || busy) return;
    setBusy(true); setError("");
    try {
      const result = await importMathhm(createClient(), bundle, (done, total, skipped, label) => setProgress(`${done}/${total}문제 · 기존 ${skipped}개 건너뜀 · ${label}`));
      setProgress(`등록 완료: 추가 ${result.added}개 · 연결 복구 ${result.repaired}개 · 기존 ${result.skipped}개 건너뜀`);
      setComplete(true);
    } catch (error) { setError(error instanceof Error ? error.message : "등록에 실패했습니다. 같은 파일로 다시 시도해 주세요."); }
    finally {
      await Promise.all(["math-problems", "math-subjects", "math-subjects-with-topics", "math-topics"].map((key) => cache.invalidateQueries({ queryKey: [key] })));
      setBusy(false);
    }
  }
  const subjects = [...new Set(bundle?.problems.map((problem) => problem.subject))];
  return <div className="flex flex-col gap-4">
    <Link className="text-sm text-accent" href="/math/problems">← 문제 목록</Link>
    <h2 className="text-lg font-semibold">정현민 전공수학 자료 등록</h2>
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">준비된 JSON 파일을 선택하면 문제번호·단원·유튜브 URL·문제 및 해설 이미지를 함께 등록합니다. 기존 등록 범위는 제외되며, 같은 자료를 다시 실행해도 중복을 확인합니다.</p>
      <input type="file" accept=".json" aria-label="전공수학 등록 파일" disabled={busy} onChange={async (event) => {
        const file = event.target.files?.[0]; setBundle(null); setComplete(false); setError(""); setProgress("");
        if (!file) return;
        if (file.size > 200 * 1024 * 1024) { setError("200MB 이하의 파일을 선택해 주세요."); return; }
        setBusy(true);
        try { setBundle(mathhmBundleSchema.parse(JSON.parse(await file.text()))); }
        catch { setError("전공수학 등록 파일 형식이 올바르지 않습니다."); }
        finally { setBusy(false); }
      }} />
      {bundle && <>
        <p className="text-sm">제목: 정현민 전공수학 · {bundle.problems.length}문제 · 이미지 {bundle.problems.length * 2}장</p>
        <div className="flex flex-wrap gap-2 text-xs text-text-secondary">{subjects.map((subject) => <span key={subject}>{subject} {bundle.problems.filter((problem) => problem.subject === subject).length}개</span>)}</div>
        <p className="text-xs text-text-secondary">기존 범위 제외: {Object.entries(bundle.cutoffs).map(([subject, number]) => `${subject} ${number}번까지`).join(" · ")}</p>
        <div className="max-h-80 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">과목 / 번호</th><th className="p-2">단원</th><th className="p-2">유튜브</th></tr></thead><tbody>{bundle.problems.map((problem) => <tr key={problem.id} className="border-t border-border"><td className="p-2">{problem.subject} {problem.problem_number}번</td><td className="p-2">{renderMath(problem.unit)}</td><td className="p-2">{problem.youtube_url ? <a className="text-accent" href={problem.youtube_url} target="_blank" rel="noopener noreferrer">링크 확인</a> : "원본 미등록"}</td></tr>)}</tbody></table></div>
        <Button onClick={start} disabled={busy || complete}>{busy ? "등록 중..." : complete ? "등록 완료" : "자료 등록 시작"}</Button>
      </>}
      {progress && <p role="status" className="text-sm">{progress}</p>}
      {busy && <p className="text-xs text-text-secondary">이 화면을 열어 두세요. 등록이 중단되면 같은 파일로 다시 시작할 수 있습니다.</p>}
      {error && <p role="alert" className="text-sm text-status-unknown">{error}</p>}
    </Card>
  </div>;
}
