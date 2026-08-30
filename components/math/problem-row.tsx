"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { FavoriteButton } from "@/components/math/favorite-button";
import { getSubjectColor } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";
import type { ProblemStatus } from "@/types/database";

export interface ProblemListItem {
  id: string;
  title: string;
  is_favorite: boolean;
  current_status: ProblemStatus | null;
  problem_number: string | null;
  subjectName: string;
  subjectOrderIndex: number;
  topicName: string;
}

export function ProblemRow({
  problem,
  onToggleFavorite,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: {
  problem: ProblemListItem;
  onToggleFavorite: (id: string, next: boolean) => Promise<void>;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const color = getSubjectColor(problem.subjectOrderIndex);

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5 transition-colors",
        selected ? "border-accent bg-accent-soft" : "hover:border-accent"
      )}
    >
      {selectionMode && (
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
            selected ? "border-accent bg-accent text-bg" : "border-border text-transparent"
          )}
        >
          <Check size={14} strokeWidth={2.5} />
        </span>
      )}

      {!selectionMode && (
        <FavoriteButton
          isFavorite={problem.is_favorite}
          onToggle={(next) => onToggleFavorite(problem.id, next)}
        />
      )}

      <span
        className={cn(
          "shrink-0 rounded-sm border px-2 py-0.5 text-xs font-medium",
          color.border,
          color.soft,
          color.text
        )}
      >
        {problem.subjectName}
      </span>
      <span className="hidden shrink-0 text-xs text-text-secondary sm:inline">{problem.topicName}</span>

      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="min-w-0 truncate text-sm font-medium text-text-primary">
          {problem.title}
        </span>
        {problem.problem_number && (
          <span className="shrink-0 font-mono text-xs text-text-secondary">
            {problem.problem_number}
          </span>
        )}
      </span>

      <StatusPill status={problem.current_status} />
    </div>
  );

  if (selectionMode) {
    return (
      <button
        type="button"
        onClick={() => onToggleSelect?.(problem.id)}
        aria-pressed={selected}
        className="block w-full text-left"
      >
        {content}
      </button>
    );
  }

  return <Link href={`/math/problems/${problem.id}`}>{content}</Link>;
}
