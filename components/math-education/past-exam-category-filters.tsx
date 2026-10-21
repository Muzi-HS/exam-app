"use client";

import { FilterChipGroup } from "@/components/math/filter-chip-group";
import { getSubjectColor } from "@/lib/subject-colors";
import { categoryPath, type CategorySelection, type PastExamCategory } from "@/lib/past-exams";

export function PastExamCategoryFilters({ categories, value, onChange }: {
  categories: PastExamCategory[]; value: CategorySelection; onChange: (value: CategorySelection) => void;
}) {
  const roots = categories.filter((item) => !item.parent_id);
  const groups = categories.filter((item) => item.parent_id && value[0].includes(item.parent_id));
  const leaves = categories.filter((item) => item.parent_id && value[1].includes(item.parent_id));
  const options = (items: PastExamCategory[]) => items.map((item) => {
    const root = categoryPath(categories, item.id)[0];
    return { value: item.id, label: item.name, color: getSubjectColor(root?.order_index ?? 0) };
  });
  function change(depth: number, ids: string[]) {
    const next: CategorySelection = [[...value[0]], [...value[1]], [...value[2]]];
    next[depth] = ids;
    for (let level = depth + 1; level < 3; level++) {
      next[level] = next[level].filter((id) => {
        const item = categories.find((category) => category.id === id);
        return !!item?.parent_id && next[level - 1].includes(item.parent_id);
      });
    }
    onChange(next);
  }
  return <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between"><p className="text-xs text-text-secondary">분류 · 여러 개 선택 가능</p>
      {value[0].length > 0 && <button type="button" onClick={() => onChange([[], [], []])} className="min-h-10 text-xs text-accent">전체 보기</button>}</div>
    <FilterChipGroup options={options(roots)} selected={value[0]} onChange={(ids) => change(0, ids)} />
    {groups.length > 0 && <FilterChipGroup options={options(groups)} selected={value[1]} onChange={(ids) => change(1, ids)} size="sm" className="border-l border-border pl-3" />}
    {leaves.length > 0 && <FilterChipGroup options={options(leaves)} selected={value[2]} onChange={(ids) => change(2, ids)} size="sm" className="border-l border-border pl-6" />}
  </div>;
}
