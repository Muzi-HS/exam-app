import type { Database } from "@/types/database";

export type PastExamCategory = Database["public"]["Tables"]["past_exam_categories"]["Row"];
export type PastExam = Database["public"]["Tables"]["past_exam_problems"]["Row"];
export const PAST_EXAMS_PATH = "/math-education/past-exams";
export const PAST_EXAM_PRACTICE_PATH = "/math-education/practice";
export type CategorySelection = [string[], string[], string[]];
export const EMPTY_CATEGORY_SELECTION: CategorySelection = [[], [], []];

// A narrower choice replaces its ancestor only in that branch of the tree.
export function categoryTargets(categories: PastExamCategory[], selection: CategorySelection): string[] {
  const [roots, groups, leaves] = selection;
  return roots.flatMap((root) => {
    const selectedGroups = categories.filter((item) => item.parent_id === root && groups.includes(item.id));
    return selectedGroups.length ? selectedGroups.flatMap((group) => {
      const selectedLeaves = categories.filter((item) => item.parent_id === group.id && leaves.includes(item.id));
      return selectedLeaves.length ? selectedLeaves.map((item) => item.id) : [group.id];
    }) : [root];
  });
}

export function matchesCategories(categories: PastExamCategory[], categoryId: string, targets: string[]) {
  return !targets.length || categoryPath(categories, categoryId).some((item) => targets.includes(item.id));
}

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
