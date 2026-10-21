import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const imageSchema = z.object({ name: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), data: z.string().min(1) });
export const importBundleSchema = z.object({
  version: z.literal(1),
  categories: z.array(z.object({ id: z.string().min(1), parent_id: z.string().nullable(), name: z.string().trim().min(1), order_index: z.number().int() })).max(200),
  problems: z.array(z.object({
    id: z.string().uuid(), title: z.string().trim().min(1), year: z.number().int().min(1900).max(2200),
    problem_number: z.string(), category_id: z.string().min(1), keywords: z.array(z.string().trim().min(1)), memo: z.string(),
    problem_images: z.array(imageSchema).min(1), solution_images: z.array(imageSchema),
  })).min(1).max(1000),
}).superRefine((bundle, context) => {
  if (new Set(bundle.problems.map((problem) => problem.id)).size !== bundle.problems.length) {
    context.addIssue({ code: "custom", message: "문제 ID가 중복됩니다." });
  }
  const ids = new Set(bundle.categories.map((category) => category.id));
  if (bundle.problems.some((problem) => !ids.has(problem.category_id))) {
    context.addIssue({ code: "custom", message: "문제의 분류가 등록 파일에 없습니다." });
  }
});

export type ProblemImportBundle = z.infer<typeof importBundleSchema>;

export async function importProblemBundle(supabase: SupabaseClient<Database>, bundle: ProblemImportBundle,
  onProgress: (done: number, total: number, skipped: number) => void) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("로그인이 필요합니다.");
  // Preflight the keywords migration before uploading any images.
  const preflight = await supabase.from("past_exam_problems").select("id, keywords").limit(1);
  if (preflight.error) throw new Error("문제/키워드 SQL 적용 여부를 확인해 주세요: " + preflight.error.message);
  const existingCategories = await supabase.from("past_exam_categories").select("id");
  if (existingCategories.error) throw existingCategories.error;
  const known = new Set(existingCategories.data.map((category) => category.id));
  const pending = bundle.categories.filter((category) => !known.has(category.id));
  while (pending.length) {
    const index = pending.findIndex((category) => !category.parent_id || known.has(category.parent_id));
    if (index < 0) throw new Error("분류의 상위 항목이 없거나 순환 관계입니다.");
    const [category] = pending.splice(index, 1);
    const result = await supabase.from("past_exam_categories").upsert(category, { onConflict: "id", ignoreDuplicates: true });
    if (result.error) throw result.error;
    known.add(category.id);
  }
  const existingIds = new Set<string>();
  for (let offset = 0; offset < bundle.problems.length; offset += 50) {
    const existing = await supabase.from("past_exam_problems").select("id").in("id", bundle.problems.slice(offset, offset + 50).map((problem) => problem.id));
    if (existing.error) throw existing.error;
    existing.data.forEach((problem) => existingIds.add(problem.id));
  }
  let done = 0, skipped = 0;
  for (const problem of bundle.problems) {
    if (existingIds.has(problem.id)) { skipped++; done++; onProgress(done, bundle.problems.length, skipped); continue; }
    const paths = { problem: [] as string[], solution: [] as string[] };
    for (const kind of ["problem", "solution"] as const) {
      for (const [index, image] of problem[`${kind}_images`].entries()) {
        const bytes = Uint8Array.from(atob(image.data), (character) => character.charCodeAt(0));
        const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((value) => value.toString(16).padStart(2, "0")).join("");
        if (digest !== image.sha256 || bytes[0] !== 137 || bytes[1] !== 80) throw new Error(`${problem.title}: 이미지 검증 실패`);
        const path = `${user.id}/${problem.id}/${kind}/import-${index}-${digest}.png`;
        const upload = await supabase.storage.from("problem-images").upload(path, bytes, { contentType: "image/png", upsert: false });
        // Existing identical objects are reused when resuming an interrupted import.
        if (upload.error && upload.error.message !== "The resource already exists" && !["409", "Duplicate"].includes(String((upload.error as { statusCode?: string; error?: string }).statusCode ?? (upload.error as { error?: string }).error))) throw upload.error;
        paths[kind].push(path);
      }
    }
    const insert = await supabase.from("past_exam_problems").insert({
      id: problem.id, user_id: user.id, title: problem.title, year: problem.year, problem_number: problem.problem_number,
      category_id: problem.category_id, keywords: problem.keywords, memo: problem.memo,
      problem_images: paths.problem, solution_images: paths.solution,
    });
    if (insert.error) {
      if (insert.error.code !== "23505") throw insert.error;
      const check = await supabase.from("past_exam_problems").select("id").eq("id", problem.id).single();
      if (check.error) throw check.error;
      skipped++;
    }
    done++; onProgress(done, bundle.problems.length, skipped);
  }
  let verified = 0;
  for (let offset = 0; offset < bundle.problems.length; offset += 50) {
    const check = await supabase.from("past_exam_problems").select("id").in("id", bundle.problems.slice(offset, offset + 50).map((problem) => problem.id));
    if (check.error) throw check.error;
    verified += check.data.length;
  }
  if (verified !== bundle.problems.length) throw new Error("일부 문항을 DB에서 확인하지 못했습니다. 같은 파일로 다시 실행해 주세요.");
  return { total: done, added: done - skipped, skipped };
}
