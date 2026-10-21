import type { Database } from "@/types/database";

export type PastExamCategory = Database["public"]["Tables"]["past_exam_categories"]["Row"];
export type PastExam = Database["public"]["Tables"]["past_exam_problems"]["Row"];
export const PAST_EXAMS_PATH = "/math-education/past-exams";

export function categoryPath(categories: PastExamCategory[], id: string): PastExamCategory[] {
  const path: PastExamCategory[] = [];
  const visited = new Set<string>();
  let current = categories.find((category) => category.id === id);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = categories.find((category) => category.id === current?.parent_id);
  }
  return path;
}
