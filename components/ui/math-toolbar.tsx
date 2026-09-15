"use client";

import { cn } from "@/lib/utils";

type FieldEl = HTMLTextAreaElement | HTMLInputElement;

interface MathSnippet {
  label: string;
  before: string;
  after: string;
}

const SNIPPETS: MathSnippet[] = [
  { label: "√", before: "\\sqrt{", after: "}" },
  { label: "xʸ", before: "^{", after: "}" },
  { label: "xᵧ", before: "_{", after: "}" },
  { label: "a/b", before: "\\frac{", after: "}{}" },
  { label: "Σ", before: "\\sum_{", after: "}^{}" },
  { label: "∫", before: "\\int_{", after: "}^{}" },
  { label: "lim", before: "\\lim_{", after: "}" },
  { label: "∞", before: "\\infty", after: "" },
  { label: "→", before: "\\to", after: "" },
  { label: "≤", before: "\\leq", after: "" },
  { label: "≥", before: "\\geq", after: "" },
  { label: "≠", before: "\\neq", after: "" },
  { label: "±", before: "\\pm", after: "" },
  { label: "·", before: "\\cdot", after: "" },
  { label: "×", before: "\\times", after: "" },
  { label: "α", before: "\\alpha", after: "" },
  { label: "β", before: "\\beta", after: "" },
  { label: "θ", before: "\\theta", after: "" },
  { label: "π", before: "\\pi", after: "" },
  { label: "φ", before: "\\varphi", after: "" },
  { label: "λ", before: "\\lambda", after: "" },
  { label: "$…$", before: "$", after: "$" },
  { label: "$$…$$", before: "$$", after: "$$" },
];

// 텍스트 입력창(textarea/input)의 커서 위치(또는 선택 영역)에 LaTeX 조각을 끼워 넣는
// 간단한 수식 편집기 툴바입니다. 값 자체는 여전히 일반 텍스트($...$ / $$...$$)라서
// lib/math-render.tsx 의 렌더링 방식과 완전히 호환됩니다.
export function MathToolbar({
  targetRef,
  value,
  onChange,
  className,
}: {
  targetRef: React.RefObject<FieldEl | null>;
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  function insert(snippet: MathSnippet) {
    const el = targetRef.current;
    const current = value ?? "";

    if (!el) {
      onChange(current + snippet.before + snippet.after);
      return;
    }

    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const selected = current.slice(start, end);
    const next = current.slice(0, start) + snippet.before + selected + snippet.after + current.slice(end);
    onChange(next);

    const cursor = selected
      ? start + snippet.before.length + selected.length + snippet.after.length
      : start + snippet.before.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className={cn("flex flex-wrap gap-1 rounded-sm border border-dashed border-border bg-bg p-1.5", className)}>
      {SNIPPETS.map((s) => (
        <button
          key={s.label}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(s)}
          title={s.before + s.after}
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-sm border border-border px-1.5 font-mono text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
