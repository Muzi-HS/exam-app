"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { PAST_EXAMS_PATH } from "@/lib/past-exams";
import { getPublicImageUrl, problemImagePath, uploadProblemImage, removeProblemImages } from "@/lib/supabase/storage";
import { CategoryPicker, usePastExamCategories, pastExamErrorMessage } from "./past-exam-shared";
import { ImageDropzone, type PendingImage } from "@/components/math/image-dropzone";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MathPreview } from "@/components/ui/math-preview";
import { TagInput } from "@/components/math/tag-input";

const empty = { title: "", year: "", problem_number: "", content: "", solution_content: "", memo: "" };

export function PastExamForm({ id }: { id?: string }) {
  const router = useRouter();
  const cache = useQueryClient();
  const categories = usePastExamCategories();
  const [fields, setFields] = useState(empty);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [existing, setExisting] = useState<{ problem: string[]; solution: string[] }>({ problem: [], solution: [] });
  const [pending, setPending] = useState<{ problem: PendingImage[]; solution: PendingImage[] }>({ problem: [], solution: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const problem = useQuery({ queryKey: ["past-exam", id], enabled: !!id, queryFn: async () => {
    const { data, error } = await createClient().from("past_exam_problems").select("*").eq("id", id!).single();
    if (error) throw error;
    return data;
  }});
  useEffect(() => {
    if (!problem.data) return;
    const row = problem.data;
    setFields({ title: row.title, year: row.year?.toString() ?? "", problem_number: row.problem_number,
      content: row.content, solution_content: row.solution_content, memo: row.memo });
    setKeywords(row.keywords ?? []);
    setCategory(row.category_id);
    setExisting({ problem: row.problem_images, solution: row.solution_images });
  }, [problem.data]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!category || categories.data?.some((item) => item.parent_id === category)) {
      setError("분류를 세부항목까지 선택해 주세요."); return;
    }
    if (!fields.title.trim()) { setError("제목을 입력해 주세요."); return; }
    if (!fields.content.trim() && !existing.problem.length && !pending.problem.length) {
      setError("문제 내용이나 이미지를 최소 하나 등록해 주세요."); return;
    }
    setSaving(true);
    const supabase = createClient();
    const uploaded: string[] = [];
    let committed = false;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("로그인이 필요합니다.");
      const problemId = id ?? crypto.randomUUID();
      const images = { problem: [...existing.problem], solution: [...existing.solution] };
      for (const kind of ["problem", "solution"] as const) {
        for (const image of pending[kind]) {
          const path = problemImagePath(user.id, problemId, kind, image.file.name);
          await uploadProblemImage(supabase, path, image.file);
          uploaded.push(path); images[kind].push(path);
        }
      }
      const payload = { ...fields, title: fields.title.trim(), year: fields.year ? Number(fields.year) : null,
        keywords: [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))],
        category_id: category, problem_images: images.problem, solution_images: images.solution };
      const result = id
        ? await supabase.from("past_exam_problems").update(payload).eq("id", id).select("id").single()
        : await supabase.from("past_exam_problems").insert({ ...payload, id: problemId, user_id: user.id }).select("id").single();
      if (result.error) throw result.error;
      committed = true;
      const retained = [...images.problem, ...images.solution];
      await removeProblemImages(supabase, [...(problem.data?.problem_images ?? []), ...(problem.data?.solution_images ?? [])].filter((path) => !retained.includes(path)));
      await cache.invalidateQueries({ queryKey: ["past-exams"] });
      await cache.invalidateQueries({ queryKey: ["past-exam", problemId] });
      router.push(`${PAST_EXAMS_PATH}/${problemId}`);
    } catch {
      if (!committed) await removeProblemImages(supabase, uploaded);
      setError("문제를 저장하지 못했습니다. 로그인 및 연결 상태를 확인하고 다시 시도해 주세요.");
    } finally { setSaving(false); }
  }
  if (categories.error || problem.error) return <div className="flex flex-col items-start gap-3"><p role="alert">{pastExamErrorMessage(categories.error ?? problem.error)}</p><Button variant="secondary" onClick={() => { void categories.refetch(); if (id) void problem.refetch(); }}>다시 불러오기</Button></div>;
  if (categories.isLoading || (id && problem.isLoading)) return <p>불러오는 중...</p>;
  return <form onSubmit={save} className="flex flex-col gap-4">
    <h2 className="text-lg font-semibold">문제 {id ? "수정" : "등록"}</h2>
    <fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <CategoryPicker categories={categories.data ?? []} value={category} onChange={setCategory} required />
        {([['title', '제목 *'], ['year', '출제 연도'], ['problem_number', '문제번호']] as const).map(([key, label]) =>
          <label key={key} className="flex flex-col gap-1 text-sm text-text-secondary">{label}<Input value={fields[key]}
            required={key === "title"} type={key === "year" ? "number" : "text"}
            min={key === "year" ? 1900 : undefined} max={key === "year" ? 2200 : undefined} step={key === "year" ? 1 : undefined}
            onChange={(event) => setFields({ ...fields, [key]: event.target.value })} /></label>)}
        <div className="flex flex-col gap-1.5"><p className="text-sm text-text-secondary">키워드</p>
          <TagInput value={keywords} onChange={setKeywords} placeholder="키워드 입력 후 Enter 또는 쉼표" />
          <p className="text-xs text-text-secondary">여러 키워드를 추가할 수 있으며 목록에서 검색할 수 있습니다.</p>
        </div>
      </Card>
      {([['problem', 'content', '문제'], ['solution', 'solution_content', '해설']] as const).map(([kind, key, label]) => <Card key={kind} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">{label} 내용<Textarea rows={5} value={fields[key]} onChange={(event) => setFields({ ...fields, [key]: event.target.value })} placeholder="텍스트와 $...$ 수식을 입력할 수 있습니다." /></label>
        <MathPreview text={fields[key]} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{existing[kind].map((path) => <div key={path}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getPublicImageUrl(createClient(), path)} alt={`${label} 이미지`} className="h-32 w-full object-contain" />
          <Button type="button" variant="ghost" onClick={() => setExisting({ ...existing, [kind]: existing[kind].filter((item) => item !== path) })}>이미지 삭제</Button>
        </div>)}</div>
        <ImageDropzone label={`${label} 이미지`} images={pending[kind]} onChange={(images) => setPending({ ...pending, [kind]: images })} />
      </Card>)}
      <Card><label className="flex flex-col gap-1 text-sm text-text-secondary">메모<Textarea rows={3} value={fields.memo} onChange={(event) => setFields({ ...fields, memo: event.target.value })} /></label><MathPreview text={fields.memo} /></Card>
      {error && <p role="alert" className="text-sm text-status-unknown">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.push(id ? `${PAST_EXAMS_PATH}/${id}` : PAST_EXAMS_PATH)}>취소</Button><Button type="submit">{saving ? "저장 중..." : id ? "수정 저장" : "문제 등록"}</Button></div>
    </fieldset>
  </form>;
}
