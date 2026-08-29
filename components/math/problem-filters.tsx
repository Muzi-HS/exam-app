"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { FilterChipGroup } from "@/components/math/filter-chip-group";
import { SubjectTopicPicker } from "@/components/math/subject-topic-picker";
import { StatusChipGroup } from "@/components/math/status-chip-group";
import type { StatusValue } from "@/components/ui/status-icon";
import { cn } from "@/lib/utils";

export type StatusChipValue = StatusValue;

export interface ProblemFiltersState {
  subjectIds: string[];
  topicIds: string[];
  statuses: StatusValue[];
  tagIds: string[];
  favoriteOnly: boolean;
  search: string;
}

const STATUS_VALUES: StatusValue[] = ["none", "unknown", "partial", "mastered"];

export function ProblemFilters({
  value,
  onChange,
}: {
  value: ProblemFiltersState;
  onChange: (next: ProblemFiltersState) => void;
}) {
  const supabase = createClient();

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <Input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="제목으로 검색"
          className="pl-9"
        />
      </div>

      <SubjectTopicPicker
        subjectIds={value.subjectIds}
        topicIds={value.topicIds}
        onChange={({ subjectIds, topicIds }) => onChange({ ...value, subjectIds, topicIds })}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusChipGroup
          values={STATUS_VALUES}
          selected={value.statuses}
          onChange={(statuses) => onChange({ ...value, statuses })}
        />

        <button
          type="button"
          onClick={() => onChange({ ...value, favoriteOnly: !value.favoriteOnly })}
          aria-pressed={value.favoriteOnly}
          aria-label="즐겨찾기만 보기"
          title="즐겨찾기만 보기"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            value.favoriteOnly ? "text-accent" : "text-text-secondary hover:text-accent"
          )}
        >
          <Star size={17} strokeWidth={1.75} fill={value.favoriteOnly ? "currentColor" : "none"} />
        </button>
      </div>

      {tags && tags.length > 0 && (
        <FilterChipGroup
          options={tags.map((t) => ({ value: t.id, label: t.name }))}
          selected={value.tagIds}
          onChange={(tagIds) => onChange({ ...value, tagIds })}
          size="sm"
        />
      )}
    </div>
  );
}
