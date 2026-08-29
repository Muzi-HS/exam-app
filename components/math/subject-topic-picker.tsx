"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FilterChipGroup } from "@/components/math/filter-chip-group";
import { getSubjectColor } from "@/lib/subject-colors";

interface SubjectWithTopics {
  id: string;
  name: string;
  order_index: number;
  math_topics: { id: string; name: string; order_index: number }[];
}

export function SubjectTopicPicker({
  subjectIds,
  topicIds,
  onChange,
}: {
  subjectIds: string[];
  topicIds: string[];
  onChange: (next: { subjectIds: string[]; topicIds: string[] }) => void;
}) {
  const supabase = createClient();

  const { data: subjects } = useQuery({
    queryKey: ["math-subjects-with-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("math_subjects")
        .select("id, name, order_index, math_topics(id, name, order_index)")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as SubjectWithTopics[]).map((s) => ({
        ...s,
        math_topics: [...s.math_topics].sort((a, b) => a.name.localeCompare(b.name, "ko")),
      }));
    },
  });

  const subjectOptions = useMemo(
    () =>
      (subjects ?? []).map((s) => ({
        value: s.id,
        label: s.name,
        color: getSubjectColor(s.order_index),
      })),
    [subjects]
  );

  // 과목 order_index -> 그 안에서 단원 이름순으로 정렬됩니다 (subjects가 이미 order_index순).
  const topicOptions = useMemo(() => {
    if (!subjects) return [];
    return subjects
      .filter((s) => subjectIds.includes(s.id))
      .flatMap((s) =>
        s.math_topics.map((t) => ({
          value: t.id,
          label: t.name,
          color: getSubjectColor(s.order_index),
        }))
      );
  }, [subjects, subjectIds]);

  function handleSubjectChange(nextSubjectIds: string[]) {
    const validTopicIds = new Set(
      (subjects ?? [])
        .filter((s) => nextSubjectIds.includes(s.id))
        .flatMap((s) => s.math_topics.map((t) => t.id))
    );
    onChange({
      subjectIds: nextSubjectIds,
      topicIds: topicIds.filter((id) => validTopicIds.has(id)),
    });
  }

  function handleTopicChange(nextTopicIds: string[]) {
    onChange({ subjectIds, topicIds: nextTopicIds });
  }

  return (
    <div className="flex flex-col gap-2">
      <FilterChipGroup options={subjectOptions} selected={subjectIds} onChange={handleSubjectChange} />
      {subjectIds.length > 0 && topicOptions.length > 0 && (
        <FilterChipGroup
          options={topicOptions}
          selected={topicIds}
          onChange={handleTopicChange}
          size="sm"
          className="border-l border-border pl-3"
        />
      )}
    </div>
  );
}
