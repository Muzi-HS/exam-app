"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SortableNameList, type SortableNameItem } from "@/components/math/sortable-name-list";
import { TopicsSection } from "@/components/math/topics-section";
import { removeProblemImages } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

type Subject = SortableNameItem;

async function countProblemsForSubject(
  supabase: ReturnType<typeof createClient>,
  subjectId: string
) {
  const { count } = await supabase
    .from("math_problems")
    .select("id, math_topics!inner(subject_id)", { count: "exact", head: true })
    .eq("math_topics.subject_id", subjectId);
  return count ?? 0;
}

async function collectStoragePathsForSubject(
  supabase: ReturnType<typeof createClient>,
  subjectId: string
) {
  const { data: topics } = await supabase
    .from("math_topics")
    .select("id")
    .eq("subject_id", subjectId);
  const topicIds = (topics ?? []).map((t) => t.id);
  if (topicIds.length === 0) return [];

  const { data: problems } = await supabase
    .from("math_problems")
    .select("id")
    .in("topic_id", topicIds);
  const problemIds = (problems ?? []).map((p) => p.id);
  if (problemIds.length === 0) return [];

  const { data: images } = await supabase
    .from("problem_images")
    .select("storage_path")
    .in("problem_id", problemIds);
  return (images ?? []).map((i) => i.storage_path);
}

export function SubjectsManager() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<{
    subject: Subject;
    problemCount: number | null;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: subjects, isLoading, error } = useQuery({
    queryKey: ["math-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("math_subjects")
        .select("id, name, order_index")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Subject[];
    },
  });

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(name: string) {
    const maxOrder = subjects && subjects.length > 0
      ? Math.max(...subjects.map((s) => s.order_index))
      : -1;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("math_subjects")
      .insert({ name, user_id: user.id, order_index: maxOrder + 1 });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["math-subjects"] });
  }

  async function handleRename(id: string, name: string) {
    const { error } = await supabase.from("math_subjects").update({ name }).eq("id", id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["math-subjects"] });
  }

  async function handleReorder(orderedIds: string[]) {
    queryClient.setQueryData<Subject[]>(["math-subjects"], (prev) =>
      prev
        ? orderedIds
            .map((id, index) => {
              const item = prev.find((s) => s.id === id);
              return item ? { ...item, order_index: index } : null;
            })
            .filter((s): s is Subject => s !== null)
        : prev
    );
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from("math_subjects").update({ order_index: index }).eq("id", id)
      )
    );
    queryClient.invalidateQueries({ queryKey: ["math-subjects"] });
  }

  async function handleRequestDelete(subject: Subject) {
    setPendingDelete({ subject, problemCount: null });
    const count = await countProblemsForSubject(supabase, subject.id);
    setPendingDelete((prev) => (prev && prev.subject.id === subject.id ? { ...prev, problemCount: count } : prev));
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const paths = await collectStoragePathsForSubject(supabase, pendingDelete.subject.id);
      const { error } = await supabase
        .from("math_subjects")
        .delete()
        .eq("id", pendingDelete.subject.id);
      if (error) throw error;
      await removeProblemImages(supabase, paths);
      queryClient.invalidateQueries({ queryKey: ["math-subjects"] });
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-secondary">불러오는 중...</p>;
  }

  if (error) {
    return (
      <EmptyState
        title="과목을 불러오지 못했습니다"
        description="네트워크 상태를 확인하고 새로고침해 주세요."
      />
    );
  }

  return (
    <Card>
      {subjects && subjects.length === 0 ? (
        <EmptyState
          title="등록된 과목이 없습니다"
          description="아래에서 새 과목을 추가해 보세요."
        />
      ) : null}

      <SortableNameList
        items={subjects ?? []}
        onCreate={handleCreate}
        onRename={handleRename}
        onReorder={handleReorder}
        onRequestDelete={handleRequestDelete}
        createPlaceholder="새 과목 이름"
        renderLeading={(subject) => (
          <button
            type="button"
            aria-label={expanded.has(subject.id) ? "접기" : "펼치기"}
            onClick={() => toggleExpanded(subject.id)}
            className="shrink-0 text-text-secondary hover:text-text-primary"
          >
            {expanded.has(subject.id) ? (
              <ChevronDown size={16} strokeWidth={1.75} />
            ) : (
              <ChevronRight size={16} strokeWidth={1.75} />
            )}
          </button>
        )}
      />

      <div className="mt-1 flex flex-col gap-2">
        {(subjects ?? [])
          .filter((s) => expanded.has(s.id))
          .map((subject) => (
            <div
              key={subject.id}
              className={cn("ml-6 border-l border-border pl-4 pb-1")}
            >
              <TopicsSection subjectId={subject.id} />
            </div>
          ))}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="과목 삭제"
        description={
          pendingDelete
            ? pendingDelete.problemCount === null
              ? "문제 수를 확인하는 중..."
              : pendingDelete.problemCount > 0
                ? `"${pendingDelete.subject.name}" 과목에는 ${pendingDelete.problemCount}개의 문제가 있습니다. 삭제하면 단원, 문제, 이미지 등 관련 데이터가 모두 함께 삭제됩니다. 계속할까요?`
                : `"${pendingDelete.subject.name}" 과목을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
            : ""
        }
        confirmLabel="삭제"
        loading={deleting || pendingDelete?.problemCount === null}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Card>
  );
}
