import { cn } from "@/lib/utils";

export type ProblemStatus = "unknown" | "partial" | "mastered";

const STATUS_ORDER: ProblemStatus[] = ["unknown", "partial", "mastered"];

const STATUS_LABEL: Record<ProblemStatus, string> = {
  unknown: "이해 못함",
  partial: "어느 정도",
  mastered: "완벽",
};

const STATUS_COLOR: Record<ProblemStatus, string> = {
  unknown: "bg-status-unknown",
  partial: "bg-status-partial",
  mastered: "bg-status-mastered",
};

/**
 * 3단계 이해도를 3개의 점으로 표시하는 시그니처 컴포넌트.
 * 현재 상태까지의 점만 채워지고 이후 단계는 빈 점으로 표시되어
 * "어디까지 왔는지"를 한눈에 보여줍니다.
 */
export function StatusPill({
  status,
  showLabel = true,
  className,
}: {
  status: ProblemStatus | null;
  showLabel?: boolean;
  className?: string;
}) {
  const currentIndex = status ? STATUS_ORDER.indexOf(status) : -1;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              i <= currentIndex ? STATUS_COLOR[status as ProblemStatus] : "bg-border"
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="font-mono text-xs text-text-secondary">
          {status ? STATUS_LABEL[status] : "미학습"}
        </span>
      )}
    </div>
  );
}
