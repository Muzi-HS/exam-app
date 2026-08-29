"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Youtube, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPublicImageUrl, removeProblemImages } from "@/lib/supabase/storage";
import { recordProgress } from "@/lib/study-session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FavoriteButton } from "@/components/math/favorite-button";
import { StatusSelector } from "@/components/math/status-selector";
import { ProblemImageViewer } from "@/components/math/problem-image-viewer";
import { ProgressHistoryList } from "@/components/math/progress-history-list";
import type { ProblemStatus } from "@/types/database";

interface ProblemDetailRow {
  id: string;
  title: string;
  problem_number: string | null;
  memo: string | null;
  youtube_url: string | null;
  is_favorite: boolean;
  current_status: ProblemStatus | null;
  last_practiced_at: string | null;
  solve_count: number;
  topic_id: string;
  math_topics: { id: string; name: string; math_subjects: { id: string; name: string } };
  problem_images: { id: string; storage_path: string; image_type: "problem" | "solution"; order_index: number }[];
  problem_tags: { tags: { id: string; name: string } }[];
}

export default function ProblemDetailPage() {
  const params = useParams<{ id: string }>();
  const problemId = params.id;
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [statusPending, setStatusPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: problem, isLoading, error } = useQuery({
    queryKey: ["math-problem", problemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("math_problems")
        .select(
          "id, title, problem_number, memo, youtube_url, is_favorite, current_status, last_practiced_at, solve_count, topic_id," +
            " math_topics!inner(id, name, math_subjects!inner(id, name))," +
            " problem_images(id, storage_path, image_type, order_index)," +
            " problem_tags(tags(id, name))"
        )
        .eq("id", problemId)
        .single()
        .returns<ProblemDetailRow>();
      if (error) throw error;
      return data;
    },
  });

  const { data: siblings } = useQuery({
    queryKey: ["math-problem-siblings", problem?.topic_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("math_problems")
        .select("id")
        .eq("topic_id", problem!.topic_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map((d) => d.id);
    },
    enabled: !!problem?.topic_id,
  });

  const { prevId, nextId } = useMemo(() => {
    if (!siblings) return { prevId: null as string | null, nextId: null as string | null };
    const idx = siblings.indexOf(problemId);
    if (idx === -1) return { prevId: null, nextId: null };
    return {
      prevId: idx > 0 ? siblings[idx - 1] : null,
      nextId: idx < siblings.length - 1 ? siblings[idx + 1] : null,
    };
  }, [siblings, problemId]);

  const problemImages = useMemo(
    () =>
      (problem?.problem_images ?? [])
        .filter((img) => img.image_type === "problem")
        .sort((a, b) => a.order_index - b.order_index)
        .map((img) => ({ id: img.id, url: getPublicImageUrl(supabase, img.storage_path) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [problem]
  );

  const solutionImages = useMemo(
    () =>
      (problem?.problem_images ?? [])
        .filter((img) => img.image_type === "solution")
        .sort((a, b) => a.order_index - b.order_index)
        .map((img) => ({ id: img.id, url: getPublicImageUrl(supabase, img.storage_path) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [problem]
  );

  async function handleToggleFavorite(next: boolean) {
    queryClient.setQueryData<ProblemDetailRow | undefined>(["math-problem", problemId], (prev) =>
      prev ? { ...prev, is_favorite: next } : prev
    );
    await supabase.from("math_problems").update({ is_favorite: next }).eq("id", problemId);
    queryClient.invalidateQueries({ queryKey: ["math-problems"] });
  }

  async function handleStatusChange(status: ProblemStatus) {
    setStatusPending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { recordedAt, solveCount } = await recordProgress(supabase, {
        userId: user.id,
        problemId,
        status,
      });

      queryClient.setQueryData<ProblemDetailRow | undefined>(["math-problem", problemId], (prev) =>
        prev
          ? { ...prev, current_status: status, last_practiced_at: recordedAt, solve_count: solveCount }
          : prev
      );
      queryClient.invalidateQueries({ queryKey: ["math-problems"] });
      queryClient.invalidateQueries({ queryKey: ["progress-history", problemId] });
    } finally {
      setStatusPending(false);
    }
  }

  async function handleDelete() {
    if (!problem) return;
    setDeleting(true);
    try {
      const paths = problem.problem_images.map((img) => img.storage_path);
      // math_problems 삭제는 problem_images/problem_tags를 cascade로 정리하지만,
      // progress_history/study_session_items는 item_id를 여러 도메인에서 공유하는 범용 컬럼이라
      // FK가 없어 cascade되지 않으므로 직접 정리합니다.
      await supabase.from("progress_history").delete().eq("item_type", "math_problem").eq("item_id", problemId);
      await supabase.from("study_session_items").delete().eq("item_type", "math_problem").eq("item_id", problemId);
      const { error: deleteError } = await supabase.from("math_problems").delete().eq("id", problemId);
      if (deleteError) throw deleteError;
      await removeProblemImages(supabase, paths);
      queryClient.invalidateQueries({ queryKey: ["math-problems"] });
      queryClient.invalidateQueries({ queryKey: ["subject-stats"] });
      queryClient.invalidateQueries({ queryKey: ["study-sessions"] });
      router.push("/math/problems");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-secondary">불러오는 중...</p>;
  }

  if (error || !problem) {
    return (
      <EmptyState
        title="문제를 불러오지 못했습니다"
        description="삭제되었거나 접근할 수 없는 문제입니다."
      />
    );
  }

  const tags = problem.problem_tags.map((pt) => pt.tags);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href="/math/problems"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          목록으로
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/math/problems/${problemId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-accent-soft hover:text-text-primary"
          >
            <Pencil size={15} strokeWidth={1.75} />
            수정
          </Link>
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmingDelete(true)}
            aria-label="문제 삭제"
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            variant={prevId ? "secondary" : "ghost"}
            disabled={!prevId}
            onClick={() => prevId && router.push(`/math/problems/${prevId}`)}
            aria-label="이전 문제"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            variant={nextId ? "secondary" : "ghost"}
            disabled={!nextId}
            onClick={() => nextId && router.push(`/math/problems/${nextId}`)}
            aria-label="다음 문제"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-text-secondary">
              {problem.math_topics.math_subjects.name} · {problem.math_topics.name}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-text-primary">{problem.title}</h1>
            {problem.problem_number && (
              <p className="mt-1 font-mono text-xs text-text-secondary">{problem.problem_number}</p>
            )}
          </div>
          <FavoriteButton isFavorite={problem.is_favorite} onToggle={handleToggleFavorite} size={22} />
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-sm bg-accent-soft px-2 py-0.5 text-xs text-accent"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {problem.memo && (
          <p className="whitespace-pre-wrap rounded-sm bg-bg p-3 text-sm text-text-secondary">
            {problem.memo}
          </p>
        )}

        {problem.youtube_url && (
          <a
            href={problem.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-sm text-text-primary hover:bg-accent-soft"
          >
            <Youtube size={16} strokeWidth={1.75} />
            유튜브에서 보기
          </a>
        )}
      </Card>

      <ProblemImageViewer problemImages={problemImages} solutionImages={solutionImages} />

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-primary">이해도</p>
          <p className="font-mono text-xs text-text-secondary">푼 횟수 {problem.solve_count}회</p>
        </div>
        <StatusSelector status={problem.current_status} onChange={handleStatusChange} disabled={statusPending} />
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-primary">최근 이력</p>
        <ProgressHistoryList problemId={problemId} limit={5} />
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        title="문제 삭제"
        description="이 문제와 관련된 이미지, 태그 연결, 이해도 이력이 모두 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
