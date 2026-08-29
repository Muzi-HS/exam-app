"use client";

import { cn } from "@/lib/utils";
import {
  StatusIcon,
  STATUS_COLOR_CLASS,
  STATUS_LABEL,
  STATUS_RING_CLASS,
  type StatusValue,
} from "@/components/ui/status-icon";

/**
 * 이해도를 기호(세모/동그라미/쌍동그라미/빈 원) 버튼으로 다중 선택하는 칩 그룹.
 * 문제 목록 필터, 연습·시험 설정 화면에서 공유합니다.
 */
export function StatusChipGroup({
  values,
  selected,
  onChange,
}: {
  values: StatusValue[];
  selected: StatusValue[];
  onChange: (next: StatusValue[]) => void;
}) {
  function toggle(value: StatusValue) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            title={STATUS_LABEL[value]}
            aria-label={STATUS_LABEL[value]}
            aria-pressed={active}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
              STATUS_COLOR_CLASS[value],
              active ? STATUS_RING_CLASS[value] : "border-transparent hover:bg-accent-soft"
            )}
          >
            <StatusIcon status={value} size={16} filled={active} />
          </button>
        );
      })}
    </div>
  );
}
