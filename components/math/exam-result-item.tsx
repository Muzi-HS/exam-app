"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { StatusSelector } from "@/components/math/status-selector";
import { ProblemImageViewer } from "@/components/math/problem-image-viewer";
import { recordProgress, type SessionItem } from "@/lib/study-session";
import type { ProblemStatus } from "@/types/database";

export function ExamResultItem({
  item,
  index,
  onRated,
}: {
  item: SessionItem;
  index: number;
  onRated: (itemId: string, status: ProblemStatus, solveCount: number) => void;
}) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);

  const problemImages = (item.problem.problem_images ?? [])
    .filter((img) => img.image_type === "problem")
    .sort((a, b) => a.order_index - b.order_index)
    .map((img) => ({ id: img.id, url: getPublicImageUrl(supabase, img.storage_path) }));
  const solutionImages = (item.problem.problem_images ?? [])
    .filter((img) => img.image_type === "solution")
    .sort((a, b) => a.order_index - b.order_index)
    .map((img) => ({ id: img.id, url: getPublicImageUrl(supabase, img.storage_path) }));

  async function handleRate(status: ProblemStatus) {
    setPending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { recordedAt, solveCount } = await recordProgress(supabase, {
        userId: user.id,
        problemId: item.item_id,
        status,
      });
      await supabase
        .from("study_session_items")
        .update({ self_rating: status, answered_at: recordedAt })
        .eq("id", item.id);
      onRated(item.id, status, solveCount);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={16} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
          ) : (
            <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
          )}
          <div>
            <p className="text-xs text-text-secondary">
              {index + 1}. {item.problem.math_topics.math_subjects.name} · {item.problem.math_topics.name}
            </p>
            <p className="text-sm font-medium text-text-primary">{item.problem.title}</p>
          </div>
        </div>
        <StatusPill status={item.self_rating} />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          <ProblemImageViewer problemImages={problemImages} solutionImages={solutionImages} />
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-text-primary">이해도 자기 평가</p>
              <p className="font-mono text-xs text-text-secondary">푼 횟수 {item.problem.solve_count}회</p>
            </div>
            <StatusSelector status={item.self_rating} onChange={handleRate} disabled={pending} />
          </div>
        </div>
      )}
    </Card>
  );
}
