"use client";

import { cn } from "@/lib/utils";
import type { SubjectColor } from "@/lib/subject-colors";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  color?: SubjectColor;
}

export function FilterChipGroup<T extends string>({
  options,
  selected,
  onChange,
  multiple = true,
  size = "md",
  className,
}: {
  options: ChipOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  function toggle(value: T) {
    const isSelected = selected.includes(value);
    if (multiple) {
      onChange(isSelected ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange(isSelected ? [] : [value]);
    }
  }

  const sizeClasses =
    size === "sm" ? "min-h-10 px-2.5 text-xs" : "min-h-10 px-3 text-sm";

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center justify-center rounded-sm border font-medium transition-colors",
              sizeClasses,
              opt.color
                ? active
                  ? cn(opt.color.border, opt.color.soft, opt.color.text)
                  : cn(opt.color.border, opt.color.text, "bg-transparent hover:opacity-80")
                : active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-secondary hover:bg-accent-soft hover:text-text-primary"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
