"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { MindmapNode } from "@/lib/mindmap";
import { cn } from "@/lib/utils";

const NODE_W = 210;
const NODE_MIN_W = 90;
const NODE_H = 56;
const COL_GAP = 100;
const ROW_GAP = 40;
const PADDING = 40;

interface LaidOutNode extends MindmapNode {
  x: number;
  y: number;
  hasChildren: boolean;
  visible: boolean;
}

// position_x/y가 없는 노드는 트리 구조를 기준으로 자동 배치합니다(저장은 드래그해야 됨).
function layoutNodes(nodes: MindmapNode[]): LaidOutNode[] {
  const childrenByParent = new Map<string, MindmapNode[]>();
  for (const n of nodes) {
    const key = n.parent_node_id ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(n);
  }
  for (const list of childrenByParent.values()) list.sort((a, b) => a.order_index - b.order_index);

  const autoPos = new Map<string, { x: number; y: number }>();
  let rowCounter = 0;

  function visit(node: MindmapNode, depth: number): number {
    const children = childrenByParent.get(node.id) ?? [];
    let y: number;
    if (node.is_collapsed || children.length === 0) {
      y = rowCounter * (NODE_H + ROW_GAP);
      rowCounter++;
    } else {
      const childYs = children.map((c) => visit(c, depth + 1));
      y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    }
    autoPos.set(node.id, { x: depth * (NODE_W + COL_GAP) + PADDING, y: y + PADDING });
    return y;
  }

  const roots = childrenByParent.get("__root__") ?? [];
  for (const r of roots) visit(r, 0);

  // 접힌 조상 아래에 있는 노드는 숨김 처리
  const hiddenIds = new Set<string>();
  function markHidden(id: string) {
    for (const child of childrenByParent.get(id) ?? []) {
      hiddenIds.add(child.id);
      markHidden(child.id);
    }
  }
  for (const n of nodes) {
    if (n.is_collapsed) markHidden(n.id);
  }

  return nodes.map((n) => {
    const fallback = autoPos.get(n.id) ?? { x: PADDING, y: PADDING };
    return {
      ...n,
      x: n.position_x ?? fallback.x,
      y: n.position_y ?? fallback.y,
      hasChildren: (childrenByParent.get(n.id) ?? []).length > 0,
      visible: !hiddenIds.has(n.id),
    };
  });
}

export function MindmapCanvas({
  nodes,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onMove,
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
  onMove: (id: string, x: number, y: number) => void;
  readOnly?: boolean;
  /** false면 추가/이동 버튼과 위치 드래그는 자리만 차지하고 동작하지 않습니다
   * (열람 모드·빈칸 퀴즈 모드에서 상자 크기가 흔들리지 않도록). */
  editingEnabled?: boolean;
  quizMode?: boolean;
  revealedIds?: Set<string>;
  onToggleReveal?: (id: string) => void;
}) {
  const laidOut = useMemo(() => layoutNodes(nodes), [nodes]);
  const visibleNodes = laidOut.filter((n) => n.visible);
  const nodeById = useMemo(() => new Map(laidOut.map((n) => [n.id, n])), [laidOut]);

  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const [livePositions, setLivePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // 노드 상자는 내용에 맞춰 줄어드는데(shrink-to-fit), 연결선/캔버스 크기 계산도
  // 실제 렌더링된 폭을 따라가도록 노드마다 폭을 측정해둡니다.
  const nodeElRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [nodeWidths, setNodeWidths] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const next = new Map<string, number>();
    nodeElRefs.current.forEach((el, id) => next.set(id, el.offsetWidth));
    setNodeWidths(next);
  }, [nodes]);

  function widthOf(id: string) {
    return nodeWidths.get(id) ?? NODE_W;
  }

  const worldWidth = Math.max(800, ...visibleNodes.map((n) => n.x + widthOf(n.id) + PADDING));
  const worldHeight = Math.max(500, ...visibleNodes.map((n) => n.y + NODE_H + PADDING));

  function handlePointerDown(e: React.PointerEvent, node: LaidOutNode) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: node.x,
      originY: node.y,
      moved: false,
    });
  }

  function handlePointerMove(e: React.PointerEvent) {
    // 편집이 꺼져 있으면(열람·퀴즈 모드) 위치 이동을 막아서, 실수로 끌었다가 저장은
    // 안 되는데 화면 위치만 어긋나 보이는 상태가 남지 않도록 합니다.
    if (!dragState || !editingEnabled) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      const nextX = Math.max(0, dragState.originX + dx);
      const nextY = Math.max(0, dragState.originY + dy);
      setLivePositions((prev) => new Map(prev).set(dragState.id, { x: nextX, y: nextY }));
      setDragState((prev) => (prev ? { ...prev, moved: true } : prev));
    }
  }

  function handlePointerUp(node: LaidOutNode) {
    if (!dragState || dragState.id !== node.id) {
      setDragState(null);
      return;
    }
    if (dragState.moved) {
      const pos = livePositions.get(node.id);
      if (pos) onMove(node.id, Math.round(pos.x), Math.round(pos.y));
    } else if (quizMode && node.is_blank && onToggleReveal) {
      onToggleReveal(node.id);
    } else {
      onSelect(node.id);
    }
    setDragState(null);
  }

  function positionOf(node: LaidOutNode) {
    return livePositions.get(node.id) ?? { x: node.x, y: node.y };
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto rounded-md border border-border bg-surface"
      style={{ height: "min(70vh, 640px)" }}
    >
      <div className="relative" style={{ width: worldWidth, height: worldHeight }}>
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={worldWidth}
          height={worldHeight}
        >
          {visibleNodes
            .filter((n) => n.parent_node_id && nodeById.get(n.parent_node_id)?.visible)
            .map((n) => {
              const parent = nodeById.get(n.parent_node_id as string)!;
              const p1 = positionOf(parent);
              const p2 = positionOf(n);
              const x1 = p1.x + widthOf(parent.id);
              const y1 = p1.y + NODE_H / 2;
              const x2 = p2.x;
              const y2 = p2.y + NODE_H / 2;
              const midX = (x1 + x2) / 2;
              return (
                <path
                  key={n.id}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="rgb(var(--border))"
                  strokeWidth={1.5}
                />
              );
            })}
        </svg>

        {visibleNodes.map((node) => {
          const pos = positionOf(node);
          const dragging = dragState?.id === node.id && dragState.moved;
          const isQuizBlank = quizMode && node.is_blank;
          const isRevealed = !!revealedIds?.has(node.id);
          const hideName = isQuizBlank && !isRevealed;
          return (
            <div
              key={node.id}
              ref={(el) => {
                if (el) nodeElRefs.current.set(node.id, el);
                else nodeElRefs.current.delete(node.id);
              }}
              onPointerDown={(e) => handlePointerDown(e, node)}
              onPointerMove={handlePointerMove}
              onPointerUp={() => handlePointerUp(node)}
              style={{
                left: pos.x,
                top: pos.y,
                minHeight: NODE_H,
                maxWidth: NODE_W,
                minWidth: NODE_MIN_W,
              }}
              className={cn(
                "group absolute flex cursor-grab select-none items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-2 shadow-subtle transition-shadow hover:border-accent active:cursor-grabbing",
                dragging && "z-10 shadow-lg",
                hideName && "border-dashed border-accent/50 bg-accent-soft/50",
                isQuizBlank && isRevealed && "border-accent bg-accent-soft"
              )}
            >
              {node.hasChildren ? (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onToggleCollapse(node)}
                  aria-label={node.is_collapsed ? "펼치기" : "접기"}
                  className="shrink-0 rounded-sm p-0.5 text-text-secondary hover:bg-accent-soft"
                >
                  {node.is_collapsed ? (
                    <ChevronRight size={14} strokeWidth={1.75} />
                  ) : (
                    <ChevronDown size={14} strokeWidth={1.75} />
                  )}
                </button>
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              {/* 빈칸 상태에서도 실제 이름 텍스트를 그대로 렌더링하고 시각적으로만 숨겨서,
                  글자 수 차이로 상자 크기가 바뀌지 않도록 합니다(위치·크기 고정). */}
              <span
                className={cn(
                  "min-w-0 flex-1 whitespace-normal break-words text-sm leading-snug",
                  hideName && "invisible",
                  !hideName && isQuizBlank ? "text-accent font-medium" : "text-text-primary"
                )}
              >
                {node.name}
              </span>
              {/* 열람·퀴즈 모드에서도 버튼을 그대로 마운트해서 자리만 차지하게 하고 동작만
                  막습니다 — 사라지면 상자 오른쪽 폭이 줄어들어 버리기 때문입니다(위치·크기 고정). */}
              {!readOnly && (
                <button
                  type="button"
                  disabled={!editingEnabled}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onAddChild(node.id)}
                  aria-label="하위 개념 추가"
                  aria-hidden={!editingEnabled}
                  tabIndex={!editingEnabled ? -1 : 0}
                  className={cn(
                    "shrink-0 rounded-sm p-0.5 text-text-secondary opacity-0 hover:bg-accent-soft hover:text-accent group-hover:opacity-100",
                    !editingEnabled && "pointer-events-none opacity-0 group-hover:opacity-0"
                  )}
                >
                  <Plus size={14} strokeWidth={1.75} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
