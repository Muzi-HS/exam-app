"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TagInput({
  value,
  onChange,
  placeholder = "태그 입력 후 Enter",
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-sm border border-border bg-bg px-2 py-1.5 focus-within:border-accent",
        className
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-sm bg-accent-soft px-2 py-0.5 text-xs text-accent"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`${tag} 태그 삭제`}
            className="hover:opacity-70"
          >
            <X size={12} strokeWidth={2} />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={value.length === 0 ? placeholder : ""}
        className="min-w-[100px] flex-1 border-none bg-transparent p-0 text-sm focus:border-none focus:outline-none"
      />
    </div>
  );
}
