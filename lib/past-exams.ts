import type { Database } from "@/types/database";

export type PastExamCategory = Database["public"]["Tables"]["past_exam_categories"]["Row"];
export type PastExam = Database["public"]["Tables"]["past_exam_problems"]["Row"];
export const PAST_EXAMS_PATH = "/math-education/past-exams";
export const PAST_EXAM_PRACTICE_PATH = "/math-education/practice";
export type CategorySelection = [string[], string[], string[]];
export const EMPTY_CATEGORY_SELECTION: CategorySelection = [[], [], []];

export function matchesKeywords(keywords: string[], selected: string[]) {
  return !selected.length || selected.some((keyword) => keywords.includes(keyword));
}

export interface PracticeYearRange { from: number | null; to: number | null }

export function matchesYearRange(year: number | null, range: PracticeYearRange) {
  if (range.from === null && range.to === null) return true;
  if (year === null) return false;
  return (range.from === null || year >= range.from) && (range.to === null || year <= range.to);
}

export function sortPastExamProblems<T extends { id: string; category_id: string; year: number | null; problem_number: string; title: string }>(
  problems: T[], categories: PastExamCategory[]
): T[] {
  const collator = new Intl.Collator("ko", { numeric: true });
  const paths = new Map(categories.map((category) => [category.id, categoryPath(categories, category.id)]));
  return [...problems].sort((a, b) => {
    const left = paths.get(a.category_id) ?? [];
    const right = paths.get(b.category_id) ?? [];
    for (let depth = 0; depth < Math.max(left.length, right.length); depth++) {
      const difference = (left[depth]?.order_index ?? Number.MAX_SAFE_INTEGER) - (right[depth]?.order_index ?? Number.MAX_SAFE_INTEGER);
      if (difference) return difference;
    }
    return (a.year ?? Number.MAX_SAFE_INTEGER) - (b.year ?? Number.MAX_SAFE_INTEGER)
      || (Number(!a.problem_number) - Number(!b.problem_number))
      || collator.compare(a.problem_number, b.problem_number)
      || collator.compare(a.title, b.title) || a.id.localeCompare(b.id);
  });
}

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
