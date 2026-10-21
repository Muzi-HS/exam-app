"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/select";
import { categoryPath, type PastExamCategory } from "@/lib/past-exams";

export function usePastExamCategories() {
  return useQuery({
    queryKey: ["past-exam-categories"],
    queryFn: async () => {
      const { data, error } = await createClient().from("past_exam_categories").select("*").order("order_index");
      if (error) throw error;
      return data;
    },
  });
}

export function CategoryPicker({ categories, value, onChange, required = false }: {
  categories: PastExamCategory[]; value: string; onChange: (id: string) => void; required?: boolean;
}) {
  const path = categoryPath(categories, value);
  const parents: (string | null)[] = [null, ...path.map((item) => item.id)];
  return <div className="grid gap-3 sm:grid-cols-3">
    {parents.map((parentId, depth) => {
      const options = categories.filter((item) => item.parent_id === parentId);
      if (!options.length) return null;
      return <label key={parentId ?? "root"} className="flex flex-col gap-1 text-sm text-text-secondary">
        {["대분류", "중분류", "세부항목"][depth] ?? "분류"}
        <Select aria-label={`${depth + 1}단계 분류`} value={path[depth]?.id ?? ""} required={required}
          onChange={(event) => onChange(event.target.value || parentId || "")}>
          <option value="">{required ? "선택하세요" : "전체"}</option>
          {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
      </label>;
    })}
  </div>;
}
