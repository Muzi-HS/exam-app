"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { renderMath } from "@/lib/math-render";
import { cn } from "@/lib/utils";

export interface MathSelectOption {
  value: string;
  label: string;
}

// 네이티브 <select>의 <option>은 일반 텍스트만 표시할 수 있어 LaTeX가 포함된
// 과목/단원 이름이 그대로 노출됩니다. 이 컴포넌트는 커스텀 드롭다운으로 각 옵션을
// renderMath로 렌더링해 수식이 실제로 보이도록 합니다.
export function MathSelect({
  value,
  onChange,
  options,
  placeholder = "선택하세요",
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: MathSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-sm border border-border bg-bg px-3 py-2 text-left text-sm text-text-primary outline-none focus:border-accent disabled:opacity-50"
      >
        <span className={cn("truncate", !selected && "text-text-secondary")}>
          {selected ? renderMath(selected.label, selected.value) : placeholder}
        </span>
        <ChevronDown size={15} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-sm border border-border bg-surface shadow-subtle"
        >
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-text-secondary hover:bg-accent-soft"
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent-soft",
                opt.value === value ? "bg-accent-soft text-accent" : "text-text-primary"
              )}
            >
              {renderMath(opt.label, opt.value)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
