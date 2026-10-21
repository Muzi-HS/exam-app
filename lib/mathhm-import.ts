import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const image = z.object({ id: z.string().uuid(), sha256: z.string().regex(/^[a-f0-9]{64}$/), data: z.string().min(1) });
export const mathhmBundleSchema = z.object({
  version: z.literal(1), kind: z.literal("mathhm"), cutoffs: z.record(z.number().int().nonnegative()),
  problems: z.array(z.object({
    id: z.string().uuid(), title: z.literal("정현민 전공수학"), subject: z.string().min(1), unit: z.string().min(1),
    subject_order: z.number().int(), unit_order: z.number().int(), problem_number: z.string().regex(/^\d+$/),
    youtube_url: z.string().refine((url) => !url || /^https:\/\/(www\.)?(youtube\.com\/watch\?[^\s]*v=|youtu\.be\/)[^\s]+$/.test(url)),
    images: z.object({ problem: image, solution: image }),
  })).min(1).max(2000),
}).superRefine((bundle, context) => {
  const ids = new Set<string>();
  const numbers = new Set<string>();
  for (const problem of bundle.problems) {
    const key = `${problem.subject}:${Number(problem.problem_number)}`;
    if (ids.has(problem.id) || numbers.has(key)) context.addIssue({ code: "custom", message: "문제가 중복됩니다." });
    if (Number(problem.problem_number) <= (bundle.cutoffs[problem.subject] ?? 0)) context.addIssue({ code: "custom", message: "이미 등록한 범위의 문제가 포함되어 있습니다." });
    ids.add(problem.id); numbers.add(key);
  }
});
export type MathhmBundle = z.infer<typeof mathhmBundleSchema>;

// Compare wrappers only; never rewrite LaTeX commands, braces or expression content.
export function mathhmNameKey(name: string) {
  let key = name.normalize("NFC").trim();
  if (key.startsWith("$$") && key.endsWith("$$")) key = key.slice(2, -2).trim();
  else if (key.startsWith("$") && key.endsWith("$")) key = key.slice(1, -1).trim();
  else if ((key.startsWith("\\(") && key.endsWith("\\)")) || (key.startsWith("\\[") && key.endsWith("\\]"))) key = key.slice(2, -2).trim();
  return /^[가-힣A-Za-z\s,]+$/.test(key) ? key.replace(/\s+/g, "") : key;
}

export function mathhmSubjectKey(name: string) {
  const key = name.normalize("NFC").replace(/\s+/g, "");
  const aliases: Record<string, string> = {
    "미적분학": "미분적분학", "확률과통계": "확률및통계", "복소해석학": "복소함수론",
    "미분기하": "미분기하학", "선형대수": "선형대수학",
  };
  return aliases[key] ?? key;
}

export async function importMathhm(supabase: SupabaseClient<Database>, bundle: MathhmBundle,
  progress: (done: number, total: number, skipped: number, title: string) => void) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("로그인이 필요합니다.");
  const subjectResult = await supabase.from("math_subjects").select("id, name, order_index");
  if (subjectResult.error) throw subjectResult.error;
  const subjects = subjectResult.data;
  const topicResult = await supabase.from("math_topics").select("id, subject_id, name, order_index");
  if (topicResult.error) throw topicResult.error;
  const topics = topicResult.data;
  const existing: { id: string; title: string; problem_number: string | null; topic_id: string }[] = [];
  for (let page = 0; ; page++) {
    const result = await supabase.from("math_problems").select("id, title, problem_number, topic_id").order("id").range(page * 1000, (page + 1) * 1000 - 1);
    if (result.error) throw result.error;
    existing.push(...result.data);
    if (result.data.length < 1000) break;
  }
  const existingById = new Map(existing.map((problem) => [problem.id, problem]));
  let done = 0, skipped = 0, repaired = 0;
  for (const problem of bundle.problems) {
    const label = `${problem.subject} ${problem.problem_number}번`;
    try {
      let subject = subjects.find((item) => mathhmSubjectKey(item.name) === mathhmSubjectKey(problem.subject));
      if (!subject) {
        const result = await supabase.from("math_subjects").insert({ user_id: user.id, name: problem.subject, order_index: Math.max(-1, ...subjects.map((item) => item.order_index)) + 1 }).select("id, name, order_index").single();
        if (result.error) throw result.error;
        subject = result.data; subjects.push(subject);
      }
      const subjectTopicIds = new Set(topics.filter((topic) => topic.subject_id === subject.id).map((topic) => topic.id));
      const duplicate = existing.find((item) => item.id !== problem.id && subjectTopicIds.has(item.topic_id)
        && mathhmNameKey(item.title) === mathhmNameKey(problem.title) && Number(item.problem_number) === Number(problem.problem_number));
      if (duplicate) { skipped++; done++; progress(done, bundle.problems.length, skipped, label); continue; }
      let topic = topics.find((item) => item.subject_id === subject.id && mathhmNameKey(item.name) === mathhmNameKey(problem.unit));
      if (!topic) {
        const result = await supabase.from("math_topics").insert({ user_id: user.id, subject_id: subject.id, name: problem.unit,
          order_index: Math.max(-1, ...topics.filter((item) => item.subject_id === subject.id).map((item) => item.order_index)) + 1 }).select("id, subject_id, name, order_index").single();
        if (result.error) throw result.error;
        topic = result.data; topics.push(topic);
      }
      const existingImages = await supabase.from("problem_images").select("id, image_type, storage_path, order_index").eq("problem_id", problem.id);
      if (existingImages.error) throw existingImages.error;
      const complete = existingById.has(problem.id) && ["problem", "solution"].every((kind) => existingImages.data.some((item) => item.image_type === kind));
      if (complete) { skipped++; done++; progress(done, bundle.problems.length, skipped, label); continue; }
      const imageRows: Database["public"]["Tables"]["problem_images"]["Insert"][] = [];
      for (const kind of ["problem", "solution"] as const) {
        if (existingImages.data.some((item) => item.image_type === kind)) continue;
        const image = problem.images[kind];
        const bytes = Uint8Array.from(atob(image.data), (character) => character.charCodeAt(0));
        const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((value) => value.toString(16).padStart(2, "0")).join("");
        if (digest !== image.sha256 || bytes[0] !== 137 || bytes[1] !== 80) throw new Error("원본 이미지 검증 실패");
        const storage_path = `${user.id}/${problem.id}/${kind}/mathhm-${digest}.png`;
        const upload = await supabase.storage.from("problem-images").upload(storage_path, bytes, { contentType: "image/png", upsert: false });
        if (upload.error && upload.error.message !== "The resource already exists" && String((upload.error as { statusCode?: string }).statusCode) !== "409") throw upload.error;
        imageRows.push({ id: image.id, problem_id: problem.id, user_id: user.id, image_type: kind, storage_path, order_index: 0 });
      }
      if (!existingById.has(problem.id)) {
        const result = await supabase.from("math_problems").insert({ id: problem.id, user_id: user.id, title: problem.title,
          topic_id: topic.id, problem_number: problem.problem_number, youtube_url: problem.youtube_url || null, source: "mathhm" });
        if (result.error) throw result.error;
        existingById.set(problem.id, { id: problem.id, title: problem.title, problem_number: problem.problem_number, topic_id: topic.id });
      } else repaired++;
      const result = await supabase.from("problem_images").upsert(imageRows, { onConflict: "id", ignoreDuplicates: true });
      if (result.error) throw result.error;
      const verify = await supabase.from("problem_images").select("id, image_type").eq("problem_id", problem.id);
      if (verify.error) throw verify.error;
      if (!["problem", "solution"].every((kind) => verify.data.some((item) => item.image_type === kind))) throw new Error("문제/해설 이미지 연결 확인 실패");
      done++; progress(done, bundle.problems.length, skipped, label);
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
      throw new Error(`${label}: ${message}. 같은 파일로 재시작하면 이미 완료한 문제는 건너뜁니다.`);
    }
  }
  return { total: done, skipped, repaired, added: done - skipped - repaired };
}
