"use client";

import { useState } from "react";
import { FilterChipGroup } from "@/components/math/filter-chip-group";
import { Input } from "@/components/ui/input";

export function PastExamKeywordFilters({ keywords, selected, onChange }: {
  keywords: string[]; selected: string[]; onChange: (keywords: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const options = [...new Set(keywords)].sort((a, b) => a.localeCompare(b, "ko"))
    .filter((keyword) => selected.includes(keyword) || keyword.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between"><p className="text-xs text-text-secondary">키워드 · 선택한 키워드 중 하나라도 포함된 문제</p>
      {!!selected.length && <button type="button" className="min-h-10 text-xs text-accent" onClick={() => onChange([])}>선택 해제</button>}</div>
    <Input aria-label="키워드 찾기" placeholder="키워드 찾기" value={search} onChange={(event) => setSearch(event.target.value)} />
    <FilterChipGroup options={options.map((keyword) => ({ value: keyword, label: keyword }))} selected={selected} onChange={onChange} size="sm" />
    {!keywords.length && <p className="text-xs text-text-secondary">아직 등록된 키워드가 없습니다.</p>}
  </div>;
}
