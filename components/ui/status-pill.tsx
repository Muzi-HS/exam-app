import { cn } from "@/lib/utils";
import { StatusIcon, STATUS_LABEL, STATUS_COLOR_CLASS, type StatusValue } from "@/components/ui/status-icon";
import type { ProblemStatus } from "@/types/database";

/**
 * 4단계 이해도를 기호(모양)+색으로 표시하는 시그니처 컴포넌트.
 * 미학습은 빈 원, 전혀 모름은 X, 이해 못함은 세모, 어느 정도는 동그라미, 완벽은 쌍동그라미입니다.
 */
export function StatusPill({
  status,
  showLabel = false,
  size = 15,
  className,
}: {
  status: ProblemStatus | null;
  showLabel?: boolean;
  size?: number;
  className?: string;
}) {
  const value: StatusValue = status ?? "none";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", STATUS_COLOR_CLASS[value], className)}
      title={STATUS_LABEL[value]}
    >
      <StatusIcon status={value} size={size} filled={!!status} />
      {showLabel && <span className="font-mono text-xs">{STATUS_LABEL[value]}</span>}
    </span>
  );
}
