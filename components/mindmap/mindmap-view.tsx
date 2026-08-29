"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/lib/hooks/use-is-desktop";
import { fetchNodes, createNode, updateNode, type MindmapNode } from "@/lib/mindmap";
import { MindmapCanvas } from "@/components/mindmap/mindmap-canvas";
import { MindmapTree } from "@/components/mindmap/mindmap-tree";
import { NodeDetailPanel } from "@/components/mindmap/node-detail-panel";
import type { MindmapDomain } from "@/types/database";

export function MindmapView({ domain, topicId }: { domain: MindmapDomain; topicId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queryKey = ["mindmap-nodes", topicId];
  const {
    data: nodes,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchNodes(supabase, topicId),
  });

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

  async function handleMoveSibling(node: MindmapNode, direction: "up" | "down") {
    const siblings = (nodes ?? [])
      .filter((n) => n.parent_node_id === node.parent_node_id)
      .sort((a, b) => a.order_index - b.order_index);
    const idx = siblings.findIndex((s) => s.id === node.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];

    queryClient.setQueryData<MindmapNode[]>(queryKey, (prev) =>
      prev?.map((n) => {
        if (n.id === node.id) return { ...n, order_index: other.order_index };
        if (n.id === other.id) return { ...n, order_index: node.order_index };
        return n;
      })
    );
    await Promise.all([
      updateNode(supabase, node.id, { order_index: other.order_index }),
      updateNode(supabase, other.id, { order_index: node.order_index }),
    ]);
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
      <Button type="button" variant="secondary" className="self-start" onClick={() => handleAddChild(null)}>
        <Plus size={15} strokeWidth={1.75} />
        최상위 개념 추가
      </Button>

      {!nodes || nodes.length === 0 ? (
        <EmptyState title="등록된 개념이 없습니다" description="위 버튼으로 최상위 개념을 추가해 보세요." />
      ) : isDesktop ? (
        <MindmapCanvas
          nodes={nodes}
          onSelect={setSelectedId}
          onToggleCollapse={handleToggleCollapse}
          onAddChild={handleAddChild}
          onMove={handleMove}
        />
      ) : (
        <MindmapTree
          nodes={nodes}
          onSelect={setSelectedId}
          onToggleCollapse={handleToggleCollapse}
          onAddChild={handleAddChild}
          onMoveSibling={handleMoveSibling}
        />
      )}

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          allNodes={nodes ?? []}
          nodesQueryKey={queryKey}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
