"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SortableNameList, type SortableNameItem } from "@/components/math/sortable-name-list";
import { removeProblemImages } from "@/lib/supabase/storage";

type Topic = SortableNameItem;

async function countProblemsForTopic(supabase: ReturnType<typeof createClient>, topicId: string) {
  const { count } = await supabase
    .from("math_problems")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topicId);
  return count ?? 0;
}

async function collectStoragePathsForTopic(
  supabase: ReturnType<typeof createClient>,
  topicId: string
) {
  const { data: problems } = await supabase
    .from("math_problems")
    .select("id")
    .eq("topic_id", topicId);
  const problemIds = (problems ?? []).map((p) => p.id);
  if (problemIds.length === 0) return [];

  const { data: images } = await supabase
    .from("problem_images")
    .select("storage_path")
    .in("problem_id", problemIds);
  return (images ?? []).map((i) => i.storage_path);
}

export function TopicsSection({ subjectId }: { subjectId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<{
    topic: Topic;
    problemCount: number | null;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const queryKey = ["math-topics", subjectId];

  const { data: topics, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("math_topics")
        .select("id, name, order_index")
        .eq("subject_id", subjectId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Topic[];
    },
  });

  async function handleCreate(name: string) {
    const maxOrder = topics && topics.length > 0
      ? Math.max(...topics.map((t) => t.order_index))
      : -1;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("math_topics")
      .insert({ name, subject_id: subjectId, user_id: user.id, order_index: maxOrder + 1 });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleRename(id: string, name: string) {
    const { error } = await supabase.from("math_topics").update({ name }).eq("id", id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleReorder(orderedIds: string[]) {
    queryClient.setQueryData<Topic[]>(queryKey, (prev) =>
      prev
        ? orderedIds
            .map((id, index) => {
              const item = prev.find((t) => t.id === id);
              return item ? { ...item, order_index: index } : null;
            })
            .filter((t): t is Topic => t !== null)
        : prev
    );
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from("math_topics").update({ order_index: index }).eq("id", id)
      )
    );
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleRequestDelete(topic: Topic) {
    setPendingDelete({ topic, problemCount: null });
    const count = await countProblemsForTopic(supabase, topic.id);
    setPendingDelete((prev) => (prev && prev.topic.id === topic.id ? { ...prev, problemCount: count } : prev));
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const paths = await collectStoragePathsForTopic(supabase, pendingDelete.topic.id);
      const { error } = await supabase.from("math_topics").delete().eq("id", pendingDelete.topic.id);
      if (error) throw error;
      await removeProblemImages(supabase, paths);
      queryClient.invalidateQueries({ queryKey });
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return <p className="py-2 text-xs text-text-secondary">단원 불러오는 중...</p>;
  }

  if (error) {
    return (
      <p className="py-2 text-xs text-status-unknown">단원을 불러오지 못했습니다.</p>
    );
  }

  return (
    <div className="py-2">
      {topics && topics.length === 0 ? (
        <div className="mb-2">
          <EmptyState title="단원이 없습니다" description="아래에서 단원을 추가해 보세요." />
        </div>
      ) : null}

      <SortableNameList
        items={topics ?? []}
        onCreate={handleCreate}
        onRename={handleRename}
        onReorder={handleReorder}
        onRequestDelete={handleRequestDelete}
        createPlaceholder="새 단원 이름"
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="단원 삭제"
        description={
          pendingDelete
            ? pendingDelete.problemCount === null
              ? "문제 수를 확인하는 중..."
              : pendingDelete.problemCount > 0
                ? `"${pendingDelete.topic.name}" 단원에는 ${pendingDelete.problemCount}개의 문제가 있습니다. 삭제하면 관련 문제와 이미지가 모두 함께 삭제됩니다. 계속할까요?`
                : `"${pendingDelete.topic.name}" 단원을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
            : ""
        }
        confirmLabel="삭제"
        loading={deleting || pendingDelete?.problemCount === null}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
