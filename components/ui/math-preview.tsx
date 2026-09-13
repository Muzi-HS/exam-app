import { renderMath, hasText } from "@/lib/math-render";
import { cn } from "@/lib/utils";

// 입력 폼에서 $...$ / $$...$$ 로 쓴 수식이 실제로 어떻게 보일지 즉시 확인할 수 있게
// 보여주는 미리보기 상자입니다. 값이 비어 있으면 아무것도 렌더링하지 않습니다.
export function MathPreview({ text, className }: { text?: string | null; className?: string }) {
  if (!hasText(text)) return null;
  return (
    <div
      className={cn(
        "whitespace-pre-wrap rounded-sm border border-dashed border-border bg-bg px-3 py-2 text-sm text-text-primary",
        className
      )}
    >
      <p className="mb-1 text-[11px] font-medium text-text-secondary">미리보기</p>
      {renderMath(text)}
    </div>
  );
}
