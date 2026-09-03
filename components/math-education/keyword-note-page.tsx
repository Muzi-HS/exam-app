"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  blanksToText,
  textToBlanks,
  parseBlocks,
  indexBlanks,
  renderTextWithBlanks,
} from "@/lib/blank-content";

interface Concept {
  id: string;
  name: string;
  question: string;
  blanks: string[];
  order_index: number;
}

export function KeywordNotePage({ topicId }: { topicId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: topic, isLoading: topicLoading, error: topicError } = useQuery({
    queryKey: ["keyword-note-topic", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keyword_note_topics")
        .select("id, name")
        .eq("id", topicId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const conceptsQueryKey = ["keyword-note-concepts", topicId];
  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: conceptsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keyword_note_concepts")
        .select("id, name, question, blanks, order_index")
        .eq("topic_id", topicId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Concept[];
    },
  });

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newBlanksText, setNewBlanksText] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Concept | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdd() {
    const blanks = textToBlanks(newBlanksText);
    if (!newName.trim() || !newQuestion.trim() || blanks.length === 0) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const maxOrder =
        concepts && concepts.length > 0 ? Math.max(...concepts.map((c) => c.order_index)) : -1;
      const { error } = await supabase.from("keyword_note_concepts").insert({
        topic_id: topicId,
        user_id: user.id,
        name: newName.trim(),
        question: newQuestion.trim(),
        blanks,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
      setNewName("");
      setNewQuestion("");
      setNewBlanksText("");
      setAdding(false);
      queryClient.invalidateQueries({ queryKey: conceptsQueryKey });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(
    id: string,
    values: { name: string; question: string; blanks: string[] }
  ) {
    const { error } = await supabase.from("keyword_note_concepts").update(values).eq("id", id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: conceptsQueryKey });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await supabase.from("keyword_note_concepts").delete().eq("id", pendingDelete.id);
      queryClient.invalidateQueries({ queryKey: conceptsQueryKey });
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-16">
      <Link
        href="/math-education/keyword-notes"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={15} strokeWidth={1.75} />
        주제 목록으로
      </Link>

      {topicLoading ? (
        <p className="text-sm text-text-secondary">불러오는 중...</p>
      ) : topicError || !topic ? (
        <EmptyState
          title="주제를 찾을 수 없습니다"
          description="삭제되었거나 접근할 수 없는 주제입니다."
        />
      ) : (
        <>
          <h2 className="text-lg font-semibold text-text-primary">{topic.name}</h2>

          {conceptsLoading ? (
            <p className="text-sm text-text-secondary">불러오는 중...</p>
          ) : !concepts || concepts.length === 0 ? (
            <EmptyState title="등록된 개념이 없습니다" description="아래에서 개념을 추가해 보세요." />
          ) : (
            <div className="flex flex-col gap-3">
              {concepts.map((concept) => (
                <ConceptBlock
                  key={concept.id}
                  concept={concept}
                  onUpdate={(values) => handleUpdate(concept.id, values)}
                  onRequestDelete={() => setPendingDelete(concept)}
                />
              ))}
            </div>
          )}

          {adding ? (
            <Card className="flex flex-col gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="개념 이름 (예: [개념9] ...)" />
              <Textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={"빈칸 문제 (빈칸은 ___로 표시)\n빈 줄로 문단을 구분할 수 있고, 모든 줄이 |로 시작·끝나면 표로 표시됩니다."}
                rows={4}
              />
              <Textarea
                value={newBlanksText}
                onChange={(e) => setNewBlanksText(e.target.value)}
                placeholder={"정답 (빈칸 순서대로 한 줄에 하나씩)\n예)\n개념\n원리\n법칙"}
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setAdding(false);
                    setNewName("");
                    setNewQuestion("");
                    setNewBlanksText("");
                  }}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving || !newName.trim() || !newQuestion.trim() || !newBlanksText.trim()}
                >
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </div>
            </Card>
          ) : (
            <Button type="button" variant="secondary" className="self-start" onClick={() => setAdding(true)}>
              <Plus size={15} strokeWidth={1.75} />
              개념 추가
            </Button>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="개념 삭제"
        description={pendingDelete ? `"${pendingDelete.name}"을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.` : ""}
        confirmLabel="삭제"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function ConceptBlock({
  concept,
  onUpdate,
  onRequestDelete,
}: {
  concept: Concept;
  onUpdate: (values: { name: string; question: string; blanks: string[] }) => Promise<void>;
  onRequestDelete: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(concept.name);
  const [editQuestion, setEditQuestion] = useState(concept.question);
  const [editBlanksText, setEditBlanksText] = useState(blanksToText(concept.blanks));
  const [saving, setSaving] = useState(false);

  const blankCount = concept.blanks.length;
  const blocks = parseBlocks(indexBlanks(concept.question));
  const allRevealed = blankCount > 0 && revealed.size === blankCount;

  function toggleBlank(i: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleAll() {
    setRevealed(allRevealed ? new Set() : new Set(Array.from({ length: blankCount }, (_, i) => i)));
  }

  function startEdit() {
    setEditName(concept.name);
    setEditQuestion(concept.question);
    setEditBlanksText(blanksToText(concept.blanks));
    setEditing(true);
  }

  async function saveEdit() {
    const blanks = textToBlanks(editBlanksText);
    if (!editName.trim() || !editQuestion.trim() || blanks.length === 0) return;
    setSaving(true);
    try {
      await onUpdate({ name: editName.trim(), question: editQuestion.trim(), blanks });
      setEditing(false);
      setRevealed(new Set());
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Card className="flex flex-col gap-2">
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="개념 이름" />
        <Textarea value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} rows={4} />
        <Textarea
          value={editBlanksText}
          onChange={(e) => setEditBlanksText(e.target.value)}
          placeholder="정답 (빈칸 순서대로 한 줄에 하나씩)"
          rows={4}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
            취소
          </Button>
          <Button
            type="button"
            onClick={saveEdit}
            disabled={saving || !editName.trim() || !editQuestion.trim() || !editBlanksText.trim()}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {collapsed ? (
            <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
          ) : (
            <ChevronDown size={16} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
          )}
          <span className="min-w-0 truncate text-base font-medium text-text-primary">{concept.name}</span>
        </button>
        <div className="-m-2 flex shrink-0 items-center gap-1">
          {!collapsed && blankCount > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="flex h-10 items-center rounded-sm px-2.5 text-sm font-medium text-accent hover:bg-accent-soft"
            >
              {allRevealed ? "모두 가리기" : "전체 공개"}
            </button>
          )}
          <button
            type="button"
            onClick={startEdit}
            aria-label="개념 수정"
            className="flex h-10 w-10 items-center justify-center text-text-secondary hover:text-accent"
          >
            <Pencil size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onRequestDelete}
            aria-label="개념 삭제"
            className="flex h-10 w-10 items-center justify-center text-text-secondary hover:text-status-unknown"
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-3">
          {blocks.map((block, bi) =>
            block.type === "table" ? (
              <div key={bi} className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) =>
                          ri === 0 ? (
                            <th
                              key={ci}
                              className="border border-border bg-surface px-2 py-1.5 text-center align-middle font-medium text-text-primary"
                            >
                              {renderTextWithBlanks(cell, concept.blanks, revealed, toggleBlank)}
                            </th>
                          ) : (
                            <td
                              key={ci}
                              className="border border-border px-2 py-1.5 text-center align-middle text-text-primary"
                            >
                              {renderTextWithBlanks(cell, concept.blanks, revealed, toggleBlank)}
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p key={bi} className="whitespace-pre-wrap text-base leading-[2.1] text-text-primary">
                {renderTextWithBlanks(block.text, concept.blanks, revealed, toggleBlank)}
              </p>
            )
          )}
        </div>
      )}
    </Card>
  );
}
