"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  isFavorite,
  onToggle,
  size = 18,
  className,
}: {
  isFavorite: boolean;
  onToggle: (next: boolean) => Promise<void>;
  size?: number;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      await onToggle(!isFavorite);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      aria-pressed={isFavorite}
      className={cn(
        "-m-2 flex h-10 w-10 shrink-0 items-center justify-center text-text-secondary transition-colors hover:text-accent disabled:opacity-50",
        isFavorite && "text-accent",
        className
      )}
    >
      <Star size={size} strokeWidth={1.75} fill={isFavorite ? "currentColor" : "none"} />
    </button>
  );
}
