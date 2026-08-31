"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { StatusSelector } from "@/components/math/status-selector";
import { ProblemImageViewer } from "@/components/math/problem-image-viewer";
import { recordProgress, type SessionItem } from "@/lib/study-session";
import { setWrongAnswer } from "@/lib/problem-progress";
import { cn } from "@/lib/utils";
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
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [isWrong, setIsWrong] = useState(item.problem.is_wrong);
  const [reasonDraft, setReasonDraft] = useState(item.problem.wrong_reason ?? "");
  const [savingWrong, setSavingWrong] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ["math-problems"] });
      queryClient.invalidateQueries({ queryKey: ["subject-stats"] });
      queryClient.invalidateQueries({ queryKey: ["progress-history", item.item_id] });
      queryClient.invalidateQueries({ queryKey: ["math-problem", item.item_id] });
    } finally {
      setPending(false);
    }
  }

  async function saveWrongAnswer(next: boolean, reason: string | null) {
    setSavingWrong(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await setWrongAnswer(supabase, user.id, item.item_id, next, reason);
      setIsWrong(next);
      queryClient.invalidateQueries({ queryKey: ["math-problem", item.item_id] });
      queryClient.invalidateQueries({ queryKey: ["wrong-answers"] });
    } finally {
      setSavingWrong(false);
    }
  }

  async function handleMarkCorrect() {
    setReasonDraft("");
    await saveWrongAnswer(false, null);
  }

  async function handleMarkWrong() {
    await saveWrongAnswer(true, reasonDraft.trim() || null);
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
        <div className="flex items-center gap-2">
          {isWrong && (
            <span className="rounded-sm bg-status-unknown/10 px-1.5 py-0.5 text-[11px] font-medium text-status-unknown">
              오답
            </span>
          )}
          <StatusPill status={item.self_rating} />
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          <ProblemImageViewer problemImages={problemImages} solutionImages={solutionImages} />

          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">채점</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleMarkCorrect}
                disabled={savingWrong}
                aria-pressed={!isWrong}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-sm border-2 text-sm font-medium transition-colors disabled:opacity-50",
                  !isWrong
                    ? "border-status-mastered bg-status-mastered/10 text-status-mastered"
                    : "border-transparent text-text-secondary hover:bg-accent-soft"
                )}
              >
                <Check size={16} strokeWidth={2} />
                맞음
              </button>
              <button
                type="button"
                onClick={handleMarkWrong}
                disabled={savingWrong}
                aria-pressed={isWrong}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-sm border-2 text-sm font-medium transition-colors disabled:opacity-50",
                  isWrong
                    ? "border-status-unknown bg-status-unknown/10 text-status-unknown"
                    : "border-transparent text-text-secondary hover:bg-accent-soft"
                )}
              >
                <X size={16} strokeWidth={2} />
                틀림
              </button>
            </div>

            {isWrong && (
              <div className="mt-2 flex flex-col gap-1.5">
                <Textarea
                  value={reasonDraft}
                  onChange={(e) => setReasonDraft(e.target.value)}
                  placeholder="틀린 이유를 적어두면 오답노트와 문제 상세에서 볼 수 있습니다."
                  rows={2}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="self-end"
                  disabled={savingWrong}
                  onClick={() => saveWrongAnswer(true, reasonDraft.trim() || null)}
                >
                  {savingWrong ? "저장 중..." : "틀린 이유 저장"}
                </Button>
              </div>
            )}
          </div>

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
