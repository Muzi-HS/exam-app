"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Check, X as XIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SortableNameItem {
  id: string;
  name: string;
  order_index: number;
}

interface SortableNameListProps<T extends SortableNameItem> {
  items: T[];
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onRequestDelete: (item: T) => void;
  createPlaceholder: string;
  creating?: boolean;
  renderExtra?: (item: T) => React.ReactNode;
  renderLeading?: (item: T) => React.ReactNode;
}

export function SortableNameList<T extends SortableNameItem>({
  items,
  onCreate,
  onRename,
  onReorder,
  onRequestDelete,
  createPlaceholder,
  creating,
  renderExtra,
  renderLeading,
}: SortableNameListProps<T>) {
  const [localItems, setLocalItems] = useState(items);
  const [newName, setNewName] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  useEffect(() => setLocalItems(items), [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = localItems.findIndex((i) => i.id === active.id);
    const newIndex = localItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(reordered);
    await onReorder(reordered.map((i) => i.id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || submittingCreate) return;
    setSubmittingCreate(true);
    try {
      await onCreate(trimmed);
      setNewName("");
    } finally {
      setSubmittingCreate(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {localItems.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                onRename={onRename}
                onRequestDelete={onRequestDelete}
                renderExtra={renderExtra}
                renderLeading={renderLeading}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <form onSubmit={handleCreate} className="flex gap-2 pt-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={createPlaceholder}
          className="max-w-xs"
          disabled={creating || submittingCreate}
        />
        <Button type="submit" variant="secondary" disabled={!newName.trim() || submittingCreate}>
          <Plus size={15} strokeWidth={1.75} />
          추가
        </Button>
      </form>
    </div>
  );
}

function SortableRow<T extends SortableNameItem>({
  item,
  onRename,
  onRequestDelete,
  renderExtra,
  renderLeading,
}: {
  item: T;
  onRename: (id: string, name: string) => Promise<void>;
  onRequestDelete: (item: T) => void;
  renderExtra?: (item: T) => React.ReactNode;
  renderLeading?: (item: T) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [saving, setSaving] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function saveEdit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === item.name) {
      setEditing(false);
      setEditName(item.name);
      return;
    }
    setSaving(true);
    try {
      await onRename(item.id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-sm border border-border bg-bg px-2 py-1.5",
        isDragging && "opacity-60"
      )}
    >
      <button
        type="button"
        aria-label="순서 변경"
        className="-my-1.5 -ml-1 flex h-10 w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-text-secondary hover:bg-accent-soft hover:text-text-primary active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} strokeWidth={1.75} />
      </button>

      {renderLeading?.(item)}

      {editing ? (
        <form
          className="flex flex-1 items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            saveEdit();
          }}
        >
          <Input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={saving}
            className="h-8 py-1"
          />
          <Button type="submit" variant="ghost" disabled={saving} aria-label="저장">
            <Check size={16} strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            aria-label="취소"
            onClick={() => {
              setEditing(false);
              setEditName(item.name);
            }}
          >
            <XIcon size={16} strokeWidth={1.75} />
          </Button>
        </form>
      ) : (
        <>
          <span className="flex-1 truncate text-sm text-text-primary">{item.name}</span>
          {renderExtra?.(item)}
          <Button
            type="button"
            variant="ghost"
            aria-label="이름 수정"
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="삭제"
            onClick={() => onRequestDelete(item)}
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </Button>
        </>
      )}
    </div>
  );
}
