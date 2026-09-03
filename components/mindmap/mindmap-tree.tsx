"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Plus, GripVertical } from "lucide-react";
import type { MindmapNode } from "@/lib/mindmap";
import { getBranchTone } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";

export function MindmapTree({
  nodes,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onReorderSiblings,
  readOnly = false,
  editingEnabled = true,
  quizMode = false,
  revealedIds,
  onToggleReveal,
}: {
  nodes: MindmapNode[];
  onSelect: (id: string) => void;
  onToggleCollapse: (node: MindmapNode) => void;
  onAddChild: (parentId: string | null) => void;
  onReorderSiblings: (parentId: string | null, orderedIds: string[]) => void;
  readOnly?: boolean;
  /** false면 드래그 순서변경·하위 개념 추가는 자리만 차지하고 동작하지 않습니다
   * (열람 모드·빈칸 퀴즈 모드에서 줄 크기가 흔들리지 않도록). */
  editingEnabled?: boolean;
  quizMode?: boolean;
  revealedIds?: Set<string>;
  onToggleReveal?: (id: string) => void;
}) {
  const childrenByParent = useMemo(() => {
    const map = new Map<string, MindmapNode[]>();
    for (const n of nodes) {
      const key = n.parent_node_id ?? "__root__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    for (const list of map.values()) list.sort((a, b) => a.order_index - b.order_index);
    return map;
  }, [nodes]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // 같은 부모를 가진 형제 노드끼리만 순서를 바꿀 수 있도록, 서로 다른 부모 사이의
  // 드롭은 무시합니다(계층 구조 자체는 이 트리에서 바꾸지 않음).
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeNode = nodeById.get(active.id as string);
    const overNode = nodeById.get(over.id as string);
    if (!activeNode || !overNode) return;
    if (activeNode.parent_node_id !== overNode.parent_node_id) return;

    const groupKey = activeNode.parent_node_id ?? "__root__";
    const siblings = childrenByParent.get(groupKey) ?? [];
    const oldIndex = siblings.findIndex((s) => s.id === activeNode.id);
    const newIndex = siblings.findIndex((s) => s.id === overNode.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(siblings, oldIndex, newIndex);
    onReorderSiblings(
      activeNode.parent_node_id,
      reordered.map((s) => s.id)
    );
  }

  const roots = childrenByParent.get("__root__") ?? [];

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-1">
        <SortableContext items={roots.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          {roots.map((node, i) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              childrenByParent={childrenByParent}
              onSelect={onSelect}
              onToggleCollapse={onToggleCollapse}
              onAddChild={onAddChild}
              readOnly={readOnly}
              editingEnabled={editingEnabled}
              quizMode={quizMode}
              revealedIds={revealedIds}
              onToggleReveal={onToggleReveal}
              colorIndex={i}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}

function TreeRow({
  node,
  depth,
  childrenByParent,
  onSelect,
  onToggleCollapse,
  onAddChild,
  readOnly,
  editingEnabled,
  quizMode,
  revealedIds,
  onToggleReveal,
  colorIndex,
}: {
  node: MindmapNode;
  depth: number;
  childrenByParent: Map<string, MindmapNode[]>;
  onSelect: (id: string) => void;
  onToggleCollapse: (node: MindmapNode) => void;
  onAddChild: (parentId: string | null) => void;
  readOnly: boolean;
  editingEnabled: boolean;
  quizMode: boolean;
  revealedIds?: Set<string>;
  onToggleReveal?: (id: string) => void;
  /** 최상위 개념(뿌리)마다 다른 파스텔 색을 배정해서, 하위 개념도 같은 색을 물려받습니다.
   * 실제 톤은 깊이에 따라 옅어지도록 getBranchTone에서 매번 계산합니다. */
  colorIndex: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: readOnly || !editingEnabled,
  });
  const children = childrenByParent.get(node.id) ?? [];
  const hasChildren = children.length > 0;
  const tone = getBranchTone(colorIndex, depth);
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isQuizBlank = quizMode && node.is_blank;
  const isRevealed = !!revealedIds?.has(node.id);
  const hideName = isQuizBlank && !isRevealed;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-10 opacity-60")}>
      <div className="flex items-center gap-0.5 py-0.5" style={{ paddingLeft: depth * 16 }}>
        {/* 열람·퀴즈 모드에서도 자리를 그대로 차지하게 두고 동작만 막습니다 — 사라지면
            줄 왼쪽 폭이 줄어들어 버리기 때문입니다(위치·크기 고정). */}
        {!readOnly && (
          <button
            type="button"
            aria-label="순서 변경"
            aria-hidden={!editingEnabled}
            className={cn(
              "flex h-10 w-6 shrink-0 touch-none items-center justify-center rounded-sm text-text-secondary",
              !editingEnabled
                ? "pointer-events-none opacity-30"
                : "cursor-grab hover:bg-accent-soft active:cursor-grabbing"
            )}
            {...attributes}
            {...listeners}
            tabIndex={!editingEnabled ? -1 : 0}
          >
            <GripVertical size={14} strokeWidth={1.75} />
          </button>
        )}

        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(node)}
            aria-label={node.is_collapsed ? "펼치기" : "접기"}
            className="flex h-10 w-8 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-accent-soft"
          >
            {node.is_collapsed ? (
              <ChevronRight size={16} strokeWidth={1.75} />
            ) : (
              <ChevronDown size={16} strokeWidth={1.75} />
            )}
          </button>
        ) : (
          <span className="w-8 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => {
            if (isQuizBlank && onToggleReveal) onToggleReveal(node.id);
            else onSelect(node.id);
          }}
          className={cn(
            "min-h-10 min-w-0 flex-1 whitespace-normal break-words rounded-sm border px-2 py-2 text-left text-sm font-medium leading-snug transition-colors hover:opacity-80",
            hideName
              ? "border-dashed border-accent/50 bg-accent-soft/50"
              : isQuizBlank
                ? "border-accent bg-accent-soft text-accent"
                : cn(tone.border, tone.bg, tone.text)
          )}
        >
          {/* 빈칸 상태에서도 실제 이름 텍스트를 그대로 렌더링하고 시각적으로만 숨겨서,
              글자 수 차이로 줄바꿈/높이가 바뀌지 않도록 합니다(위치·크기 고정). */}
          <span className={hideName ? "invisible" : undefined}>{node.name}</span>
        </button>

        {!readOnly && (
          <button
            type="button"
            disabled={!editingEnabled}
            onClick={() => onAddChild(node.id)}
            aria-label="하위 개념 추가"
            aria-hidden={!editingEnabled}
            tabIndex={!editingEnabled ? -1 : 0}
            className={cn(
              "flex h-10 w-8 shrink-0 items-center justify-center rounded-sm text-text-secondary",
              !editingEnabled ? "pointer-events-none opacity-30" : "hover:bg-accent-soft hover:text-accent"
            )}
          >
            <Plus size={15} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {!node.is_collapsed && hasChildren && (
        <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {children.map((child, i) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              childrenByParent={childrenByParent}
              onSelect={onSelect}
              onToggleCollapse={onToggleCollapse}
              onAddChild={onAddChild}
              readOnly={readOnly}
              editingEnabled={editingEnabled}
              quizMode={quizMode}
              revealedIds={revealedIds}
              onToggleReveal={onToggleReveal}
              colorIndex={colorIndex}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}
