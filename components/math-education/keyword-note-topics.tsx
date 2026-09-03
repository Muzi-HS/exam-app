"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SortableNameList, type SortableNameItem } from "@/components/math/sortable-name-list";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";

type Topic = SortableNameItem;

export function KeywordNoteTopics() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const [pendingDelete, setPendingDelete] = useState<{ topic: Topic; conceptCount: number | null } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const queryKey = ["keyword-note-topics"];

  const { data: topics, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keyword_note_topics")
        .select("id, name, order_index")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Topic[];
    },
  });

  async function handleCreate(name: string) {
    const maxOrder = topics && topics.length > 0 ? Math.max(...topics.map((t) => t.order_index)) : -1;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("keyword_note_topics")
      .insert({ name, user_id: user.id, order_index: maxOrder + 1 });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleRename(id: string, name: string) {
    const { error } = await supabase.from("keyword_note_topics").update({ name }).eq("id", id);
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
        supabase.from("keyword_note_topics").update({ order_index: index }).eq("id", id)
      )
    );
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleRequestDelete(topic: Topic) {
    setPendingDelete({ topic, conceptCount: null });
    const { count } = await supabase
      .from("keyword_note_concepts")
      .select("id", { count: "exact", head: true })
      .eq("topic_id", topic.id);
    setPendingDelete((prev) => (prev && prev.topic.id === topic.id ? { ...prev, conceptCount: count ?? 0 } : prev));
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("keyword_note_topics").delete().eq("id", pendingDelete.topic.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
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
        title="주제를 불러오지 못했습니다"
        description="네트워크 상태를 확인하고 새로고침해 주세요."
      />
    );
  }

  return (
    <Card>
      {!isDesktop && (
        <p className="mb-3 rounded-sm border border-border bg-accent-soft px-3 py-2 text-xs text-text-secondary">
          모바일에서는 주제를 열람만 할 수 있습니다. 추가·수정·순서 변경은 PC에서 해주세요.
        </p>
      )}

      {topics && topics.length === 0 ? (
        <EmptyState title="등록된 주제가 없습니다" description="아래에서 새 주제를 추가해 보세요." />
      ) : null}

      <SortableNameList
        items={topics ?? []}
        onCreate={handleCreate}
        onRename={handleRename}
        onReorder={handleReorder}
        onRequestDelete={handleRequestDelete}
        createPlaceholder="새 주제 이름"
        onItemClick={(topic) => router.push(`/math-education/keyword-notes/${topic.id}`)}
        readOnly={!isDesktop}
        renderExtra={(topic) => (
          <Button
            type="button"
            variant="ghost"
            aria-label="페이지 열기"
            onClick={() => router.push(`/math-education/keyword-notes/${topic.id}`)}
          >
            <ArrowRight size={15} strokeWidth={1.75} />
          </Button>
        )}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="주제 삭제"
        description={
          pendingDelete
            ? pendingDelete.conceptCount === null
              ? "개념 수를 확인하는 중..."
              : pendingDelete.conceptCount > 0
                ? `"${pendingDelete.topic.name}" 주제에는 ${pendingDelete.conceptCount}개의 개념이 있습니다. 삭제하면 함께 삭제됩니다. 계속할까요?`
                : `"${pendingDelete.topic.name}" 주제를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
            : ""
        }
        confirmLabel="삭제"
        loading={deleting || pendingDelete?.conceptCount === null}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Card>
  );
}
