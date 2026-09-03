"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, LayoutGrid, ListTree, HelpCircle, Eye, EyeOff, Pencil, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { fetchNodes, createNode, updateNode, type MindmapNode } from "@/lib/mindmap";
import { MindmapCanvas } from "@/components/mindmap/mindmap-canvas";
import { MindmapTree } from "@/components/mindmap/mindmap-tree";
import { NodeDetailPanel } from "@/components/mindmap/node-detail-panel";
import { cn } from "@/lib/utils";
import type { MindmapDomain } from "@/types/database";

export function MindmapView({ domain, topicId }: { domain: MindmapDomain; topicId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "tree">("canvas");
  // PC에서 편집 모드(추가·수정·삭제·이동)와 열람 모드(읽기 전용, 클릭하면 개념·문제를
  // 편하게 읽는 패널만 열림)를 구분합니다. 모바일은 항상 열람 모드와 동일하게 동작합니다.
  const [pcMode, setPcMode] = useState<"edit" | "view">("edit");
  const [quizMode, setQuizMode] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const editable = isDesktop && pcMode === "edit" && !quizMode;
  const effectiveView = isDesktop ? viewMode : "tree";

  const queryKey = ["mindmap-nodes", topicId];
  const {
    data: nodes,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchNodes(supabase, topicId),
  });

  const blankNodeIds = useMemo(() => (nodes ?? []).filter((n) => n.is_blank).map((n) => n.id), [nodes]);
  const allRevealed = blankNodeIds.length > 0 && blankNodeIds.every((id) => revealedIds.has(id));

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRevealAll() {
    setRevealedIds(allRevealed ? new Set() : new Set(blankNodeIds));
  }

  function handleToggleQuizMode() {
    setQuizMode((v) => !v);
    setRevealedIds(new Set());
    setSelectedId(null);
  }

  async function handleAddChild(parentId: string | null) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const siblings = (nodes ?? []).filter((n) => n.parent_node_id === parentId);
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.order_index)) : -1;
    const id = await createNode(supabase, {
      topicId,
      domain,
      userId: user.id,
      parentNodeId: parentId,
      name: "새 개념",
      orderIndex: maxOrder + 1,
    });
    await queryClient.invalidateQueries({ queryKey });
    setSelectedId(id);
  }

  async function handleToggleCollapse(node: MindmapNode) {
    queryClient.setQueryData<MindmapNode[]>(queryKey, (prev) =>
      prev?.map((n) => (n.id === node.id ? { ...n, is_collapsed: !n.is_collapsed } : n))
    );
    await updateNode(supabase, node.id, { is_collapsed: !node.is_collapsed });
  }

  async function handleMove(id: string, x: number, y: number) {
    queryClient.setQueryData<MindmapNode[]>(queryKey, (prev) =>
      prev?.map((n) => (n.id === id ? { ...n, position_x: x, position_y: y } : n))
    );
    await updateNode(supabase, id, { position_x: x, position_y: y });
  }

  async function handleReorderSiblings(parentId: string | null, orderedIds: string[]) {
    queryClient.setQueryData<MindmapNode[]>(queryKey, (prev) =>
      prev?.map((n) => {
        if (n.parent_node_id !== parentId) return n;
        const newIndex = orderedIds.indexOf(n.id);
        return newIndex === -1 ? n : { ...n, order_index: newIndex };
      })
    );
    await Promise.all(orderedIds.map((id, index) => updateNode(supabase, id, { order_index: index })));
  }

  if (isLoading) {
    return <p className="text-sm text-text-secondary">불러오는 중...</p>;
  }

  if (error) {
    return (
      <EmptyState
        title="마인드맵을 불러오지 못했습니다"
        description="네트워크 상태를 확인하고 새로고침해 주세요."
      />
    );
  }

  const selectedNode = selectedId ? (nodes ?? []).find((n) => n.id === selectedId) ?? null : null;

  return (
    <div className="flex flex-col gap-3">
      {!isDesktop && !quizMode && (
        <p className="rounded-sm border border-border bg-accent-soft px-3 py-2 text-xs text-text-secondary">
          모바일에서는 마인드맵을 열람만 할 수 있습니다. 편집하려면 PC에서 접속해 주세요.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isDesktop && !quizMode && (
            <div className="flex items-center rounded-sm border border-border p-0.5">
              <button
                type="button"
                onClick={() => setPcMode("edit")}
                aria-label="편집 모드"
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium transition-colors",
                  pcMode === "edit" ? "bg-accent-soft text-accent" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Pencil size={14} strokeWidth={1.75} />
                편집
              </button>
              <button
                type="button"
                onClick={() => setPcMode("view")}
                aria-label="열람 모드"
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium transition-colors",
                  pcMode === "view" ? "bg-accent-soft text-accent" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <BookOpen size={14} strokeWidth={1.75} />
                열람
              </button>
            </div>
          )}
          {editable && (
            <Button type="button" variant="secondary" onClick={() => handleAddChild(null)}>
              <Plus size={15} strokeWidth={1.75} />
              최상위 개념 추가
            </Button>
          )}
          {isDesktop && !quizMode && (
            <div className="flex items-center rounded-sm border border-border p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("canvas")}
                aria-label="캔버스 보기"
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium transition-colors",
                  viewMode === "canvas"
                    ? "bg-accent-soft text-accent"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <LayoutGrid size={14} strokeWidth={1.75} />
                캔버스
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                aria-label="트리 보기"
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium transition-colors",
                  viewMode === "tree" ? "bg-accent-soft text-accent" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <ListTree size={14} strokeWidth={1.75} />
                트리
              </button>
            </div>
          )}
          {quizMode && blankNodeIds.length > 0 && (
            <button
              type="button"
              onClick={toggleRevealAll}
              className="flex h-10 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              {allRevealed ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              {allRevealed ? "모두 가리기" : "전체 정답 공개"}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggleQuizMode}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-sm border px-3 text-sm font-medium transition-colors",
            quizMode
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-text-secondary hover:text-text-primary"
          )}
        >
          <HelpCircle size={15} strokeWidth={1.75} />
          {quizMode ? "퀴즈 모드 끄기" : "빈칸 퀴즈 모드"}
        </button>
      </div>

      {isDesktop && pcMode === "view" && !quizMode && (
        <p className="rounded-sm border border-border bg-accent-soft px-3 py-2 text-xs text-text-secondary">
          열람 모드입니다. 개념을 클릭하면 편집 없이 개념 설명과 문제만 편하게 볼 수 있어요. 수정하려면 편집 모드로
          전환해 주세요.
        </p>
      )}

      {quizMode && blankNodeIds.length === 0 && (
        <p className="rounded-sm border border-border bg-accent-soft px-3 py-2 text-xs text-text-secondary">
          빈칸으로 표시된 개념이 없습니다. 개념 상세에서 "빈칸 퀴즈 모드에서 이 노드를 빈칸으로 표시"를 켜보세요.
        </p>
      )}

      {!nodes || nodes.length === 0 ? (
        <EmptyState
          title="등록된 개념이 없습니다"
          description={editable ? "위 버튼으로 최상위 개념을 추가해 보세요." : "PC에서 먼저 개념을 추가해 주세요."}
        />
      ) : effectiveView === "canvas" ? (
        <MindmapCanvas
          nodes={nodes}
          onSelect={setSelectedId}
          onToggleCollapse={handleToggleCollapse}
          onAddChild={handleAddChild}
          onMove={handleMove}
          readOnly={!isDesktop}
          editingEnabled={editable}
          quizMode={quizMode}
          revealedIds={revealedIds}
          onToggleReveal={toggleReveal}
        />
      ) : (
        <MindmapTree
          nodes={nodes}
          onSelect={setSelectedId}
          onToggleCollapse={handleToggleCollapse}
          onAddChild={handleAddChild}
          onReorderSiblings={handleReorderSiblings}
          readOnly={!isDesktop}
          editingEnabled={editable}
          quizMode={quizMode}
          revealedIds={revealedIds}
          onToggleReveal={toggleReveal}
        />
      )}

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          allNodes={nodes ?? []}
          nodesQueryKey={queryKey}
          onClose={() => setSelectedId(null)}
          readOnly={!editable}
        />
      )}
    </div>
  );
}
