"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConceptQuestionsSection } from "@/components/mindmap/concept-questions-section";
import { getDescendantIds, type MindmapNode } from "@/lib/mindmap";

export function NodeDetailPanel({
  node,
  allNodes,
  nodesQueryKey,
  onClose,
  readOnly = false,
}: {
  node: MindmapNode;
  allNodes: MindmapNode[];
  nodesQueryKey: unknown[];
  onClose: () => void;
  readOnly?: boolean;
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState(node.description ?? "");
  const [keywords, setKeywords] = useState(node.keywords ?? "");
  const [memo, setMemo] = useState(node.memo ?? "");
  const [parentNodeId, setParentNodeId] = useState(node.parent_node_id ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(node.name);
    setDescription(node.description ?? "");
    setKeywords(node.keywords ?? "");
    setMemo(node.memo ?? "");
    setParentNodeId(node.parent_node_id ?? "");
  }, [node]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const excludedIds = getDescendantIds(node.id, allNodes);
  excludedIds.add(node.id);
  const parentOptions = allNodes.filter((n) => !excludedIds.has(n.id));
  const parentNode = node.parent_node_id ? allNodes.find((n) => n.id === node.parent_node_id) : null;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("mindmap_nodes")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          keywords: keywords.trim() || null,
          memo: memo.trim() || null,
          parent_node_id: parentNodeId || null,
        })
        .eq("id", node.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: nodesQueryKey });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from("mindmap_nodes").delete().eq("id", node.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: nodesQueryKey });
      setConfirmingDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-end sm:items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-lg border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-subtle sm:h-full sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-lg sm:border-l sm:border-t-0"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-secondary">
            {readOnly ? "개념 열람" : "개념 상세"}
          </p>
          <div className="flex items-center gap-1">
            {!readOnly && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label="개념 삭제"
                className="flex h-10 w-10 items-center justify-center rounded-sm text-text-secondary hover:bg-accent-soft hover:text-status-unknown"
              >
                <Trash2 size={17} strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-10 w-10 items-center justify-center rounded-sm text-text-secondary hover:bg-accent-soft hover:text-text-primary"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {readOnly ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm text-text-secondary">이름</p>
              <p className="mt-1 text-sm text-text-primary">{node.name}</p>
            </div>
            {node.description && (
              <div>
                <p className="text-sm text-text-secondary">설명</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{node.description}</p>
              </div>
            )}
            {node.keywords && (
              <div>
                <p className="text-sm text-text-secondary">핵심 키워드</p>
                <p className="mt-1 text-sm text-text-primary">{node.keywords}</p>
              </div>
            )}
            {node.memo && (
              <div>
                <p className="text-sm text-text-secondary">메모</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{node.memo}</p>
              </div>
            )}
            {parentNode && (
              <div>
                <p className="text-sm text-text-secondary">상위 개념</p>
                <p className="mt-1 text-sm text-text-primary">{parentNode.name}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">이름</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">설명</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">핵심 키워드</label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="쉼표로 구분" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">메모</label>
              <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">상위 개념</label>
              <Select value={parentNodeId} onChange={(e) => setParentNodeId(e.target.value)}>
                <option value="">(없음 — 최상위)</option>
                {parentOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </Select>
            </div>

            <Button type="button" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <ConceptQuestionsSection nodeId={node.id} readOnly={readOnly} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="개념 삭제"
        description="이 개념과 하위 개념, 등록된 문제가 모두 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>,
    document.body
  );
}
