"use client";

import { useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, ArrowUp, ArrowDown } from "lucide-react";
import type { MindmapNode } from "@/lib/mindmap";
import { cn } from "@/lib/utils";

export function MindmapTree({
  nodes,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onMoveSibling,
}: {
  nodes: MindmapNode[];
  onSelect: (id: string) => void;
  onToggleCollapse: (node: MindmapNode) => void;
  onAddChild: (parentId: string | null) => void;
  onMoveSibling: (node: MindmapNode, direction: "up" | "down") => void;
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

  const roots = childrenByParent.get("__root__") ?? [];

  return (
    <div className="flex flex-col gap-1">
      {roots.map((node, i) => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          childrenByParent={childrenByParent}
          onSelect={onSelect}
          onToggleCollapse={onToggleCollapse}
          onAddChild={onAddChild}
          onMoveSibling={onMoveSibling}
          isFirst={i === 0}
          isLast={i === roots.length - 1}
        />
      ))}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  childrenByParent,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onMoveSibling,
  isFirst,
  isLast,
}: {
  node: MindmapNode;
  depth: number;
  childrenByParent: Map<string, MindmapNode[]>;
  onSelect: (id: string) => void;
  onToggleCollapse: (node: MindmapNode) => void;
  onAddChild: (parentId: string | null) => void;
  onMoveSibling: (node: MindmapNode, direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const children = childrenByParent.get(node.id) ?? [];
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1"
        style={{ paddingLeft: depth * 18 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(node)}
            aria-label={node.is_collapsed ? "펼치기" : "접기"}
            className="shrink-0 rounded-sm p-1 text-text-secondary hover:bg-accent-soft"
          >
            {node.is_collapsed ? (
              <ChevronRight size={16} strokeWidth={1.75} />
            ) : (
              <ChevronDown size={16} strokeWidth={1.75} />
            )}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="min-w-0 flex-1 whitespace-normal break-words rounded-sm px-2 py-2 text-left text-sm leading-snug text-text-primary hover:bg-accent-soft"
        >
          {node.name}
        </button>

        <button
          type="button"
          onClick={() => onMoveSibling(node, "up")}
          disabled={isFirst}
          aria-label="위로 이동"
          className={cn(
            "shrink-0 rounded-sm p-1.5 text-text-secondary hover:bg-accent-soft disabled:opacity-30"
          )}
        >
          <ArrowUp size={14} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => onMoveSibling(node, "down")}
          disabled={isLast}
          aria-label="아래로 이동"
          className="shrink-0 rounded-sm p-1.5 text-text-secondary hover:bg-accent-soft disabled:opacity-30"
        >
          <ArrowDown size={14} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => onAddChild(node.id)}
          aria-label="하위 개념 추가"
          className="shrink-0 rounded-sm p-1.5 text-text-secondary hover:bg-accent-soft hover:text-accent"
        >
          <Plus size={15} strokeWidth={1.75} />
        </button>
      </div>

      {!node.is_collapsed &&
        children.map((child, i) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            childrenByParent={childrenByParent}
            onSelect={onSelect}
            onToggleCollapse={onToggleCollapse}
            onAddChild={onAddChild}
            onMoveSibling={onMoveSibling}
            isFirst={i === 0}
            isLast={i === children.length - 1}
          />
        ))}
    </div>
  );
}
