"use client";

import type { ProblemStatus } from "@/types/database";
import { cn } from "@/lib/utils";
import { StatusIcon, STATUS_COLOR_CLASS, STATUS_LABEL, STATUS_RING_CLASS } from "@/components/ui/status-icon";

const VALUES: ProblemStatus[] = ["blank", "unknown", "partial", "mastered"];

/**
 * 이해도 4단계를 기호(모양) 버튼으로 선택합니다. 선택되지 않은 상태에서도
 * 각자의 상태 색이 항상 보이고, 선택하면 배경/테두리가 강조됩니다.
 */
export function StatusSelector({
  status,
  onChange,
  disabled,
}: {
  status: ProblemStatus | null;
  onChange: (status: ProblemStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {VALUES.map((value) => {
        const active = status === value;
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value)}
            title={STATUS_LABEL[value]}
            aria-label={STATUS_LABEL[value]}
            aria-pressed={active}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50",
              STATUS_COLOR_CLASS[value],
              active ? STATUS_RING_CLASS[value] : "border-transparent hover:bg-accent-soft"
            )}
          >
            <StatusIcon status={value} size={18} filled={active} />
          </button>
        );
      })}
    </div>
  );
}
