"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { categoryPath, PAST_EXAMS_PATH } from "@/lib/past-exams";
import { getPublicImageUrl, removeProblemImages } from "@/lib/supabase/storage";
import { usePastExamCategories } from "./past-exam-shared";
import { ProblemImageViewer } from "@/components/math/problem-image-viewer";
import { renderMath } from "@/lib/math-render";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function PastExamDetail({ id }: { id: string }) {
  const supabase = createClient();
  const categories = usePastExamCategories();
  const router = useRouter();
  const cache = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["past-exam", id], queryFn: async () => {
    const { data, error } = await supabase.from("past_exam_problems").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }});
  async function remove() {
    setDeleting(true); setError("");
    try {
      const { error } = await supabase.from("past_exam_problems").delete().eq("id", id).select("id").single();
      if (error) throw error;
      await removeProblemImages(supabase, [...(query.data?.problem_images ?? []), ...(query.data?.solution_images ?? [])]);
      await cache.invalidateQueries({ queryKey: ["past-exams"] });
      cache.removeQueries({ queryKey: ["past-exam", id] });
      router.push(PAST_EXAMS_PATH);
    } catch { setError("삭제하지 못했습니다. 다시 시도해 주세요."); setConfirm(false); }
    finally { setDeleting(false); }
  }
  if (query.error || categories.error) return <p role="alert">문제를 찾을 수 없거나 불러오지 못했습니다. <Link href={PAST_EXAMS_PATH}>목록으로</Link></p>;
  if (!query.data) return <p>불러오는 중...</p>;
  const row = query.data;
  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={PAST_EXAMS_PATH} className="text-sm text-accent">← 목록</Link><div className="flex items-center gap-3"><Link href={`${PAST_EXAMS_PATH}/${id}/edit`} className="text-sm text-accent">수정</Link><Button variant="danger" onClick={() => setConfirm(true)}>삭제</Button></div></div>
    <h2 className="text-lg font-semibold">{row.title}</h2>
    <p className="text-sm text-text-secondary">{[row.year && `${row.year}년`, row.source, row.problem_number && `${row.problem_number}번`].filter(Boolean).join(" · ")}</p>
    <p className="text-sm text-text-secondary">{categoryPath(categories.data ?? [], row.category_id).map((item) => item.name).join(" / ")}</p>
    <ProblemImageViewer problemContent={row.content} solutionContent={row.solution_content}
      problemImages={row.problem_images.map((path) => ({ id: path, url: getPublicImageUrl(supabase, path) }))}
      solutionImages={row.solution_images.map((path) => ({ id: path, url: getPublicImageUrl(supabase, path) }))} />
    {row.memo && <Card><p className="mb-2 text-sm text-text-secondary">메모</p><div className="whitespace-pre-wrap text-sm">{renderMath(row.memo)}</div></Card>}
    {/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(row.youtube_url) && <a href={row.youtube_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent">유튜브 해설 보기</a>}
    {error && <p role="alert" className="text-sm text-status-unknown">{error}</p>}
    <ConfirmDialog open={confirm} title="기출문제 삭제" description="문제와 등록된 이미지를 삭제합니다. 이 작업은 되돌릴 수 없습니다." loading={deleting} onConfirm={remove} onCancel={() => { if (!deleting) setConfirm(false); }} />
  </div>;
}
