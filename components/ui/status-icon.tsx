import { Circle, Triangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProblemStatus } from "@/types/database";

export type StatusValue = "none" | ProblemStatus;

/**
 * lucide에는 "원 안에 원"(쌍동그라미) 아이콘이 없어서 직접 그립니다.
 * filled=true면 안쪽 원이 꽉 차서 "완벽" 상태가 선택/활성화됐음을 보여줍니다.
 */
export function DoubleCircle({
  size = 16,
  className,
  filled = false,
}: {
  size?: number;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.2" fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}

export const STATUS_LABEL: Record<StatusValue, string> = {
  none: "미학습",
  blank: "전혀 모름",
  unknown: "이해 못함",
  partial: "어느 정도",
  mastered: "완벽",
};

export const STATUS_COLOR_CLASS: Record<StatusValue, string> = {
  none: "text-text-secondary",
  blank: "text-status-blank",
  unknown: "text-status-unknown",
  partial: "text-status-partial",
  mastered: "text-status-mastered",
};

export const STATUS_RING_CLASS: Record<StatusValue, string> = {
  none: "border-text-secondary bg-accent-soft",
  blank: "border-status-blank bg-status-blank/10",
  unknown: "border-status-unknown bg-status-unknown/10",
  partial: "border-status-partial bg-status-partial/10",
  mastered: "border-status-mastered bg-status-mastered/10",
};

/**
 * 이해도 기호: X(전혀 모름) · 세모(이해 못함) · 동그라미(어느 정도) · 쌍동그라미(완벽) · 빈 원(미학습).
 */
export function StatusIcon({
  status,
  size = 16,
  filled = false,
  className,
}: {
  status: StatusValue;
  size?: number;
  filled?: boolean;
  className?: string;
}) {
  if (status === "blank") {
    // X는 채울 면이 없어서, 선택(filled)됐을 때는 선을 굵게 해서 강조합니다.
    return <X size={size} strokeWidth={filled ? 3 : 1.75} className={cn(className)} />;
  }
  if (status === "unknown") {
    return (
      <Triangle
        size={size}
        strokeWidth={filled ? 0 : 1.75}
        fill={filled ? "currentColor" : "none"}
        className={cn(className)}
      />
    );
  }
  if (status === "partial") {
    return (
      <Circle
        size={size}
        strokeWidth={filled ? 0 : 1.75}
        fill={filled ? "currentColor" : "none"}
        className={cn(className)}
      />
    );
  }
  if (status === "mastered") {
    return <DoubleCircle size={size} filled={filled} className={cn(className)} />;
  }
  return <Circle size={size} strokeWidth={1.75} fill="none" className={cn(className)} />;
}
