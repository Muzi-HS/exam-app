"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

interface ConceptQuestion {
  id: string;
  question: string;
  answer: string;
  memo: string | null;
  order_index: number;
}

export function ConceptQuestionsSection({
  nodeId,
  readOnly = false,
}: {
  nodeId: string;
  readOnly?: boolean;
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const queryKey = ["concept-questions", nodeId];

  const { data: questions, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concept_questions")
        .select("id, question, answer, memo, order_index")
        .eq("node_id", nodeId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as ConceptQuestion[];
    },
  });

  const [adding, setAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const maxOrder =
        questions && questions.length > 0 ? Math.max(...questions.map((q) => q.order_index)) : -1;
      const { error } = await supabase.from("concept_questions").insert({
        node_id: nodeId,
        user_id: user.id,
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        memo: newMemo.trim() || null,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
      setNewQuestion("");
      setNewAnswer("");
      setNewMemo("");
      setAdding(false);
      queryClient.invalidateQueries({ queryKey });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("concept_questions").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleUpdate(
    id: string,
    values: { question: string; answer: string; memo: string | null }
  ) {
    const { error } = await supabase.from("concept_questions").update(values).eq("id", id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">개념 문제</p>
        {!readOnly && !adding && (
          <Button type="button" variant="ghost" onClick={() => setAdding(true)}>
            <Plus size={15} strokeWidth={1.75} />
            문제 추가
          </Button>
        )}
      </div>

      {isLoading && <p className="text-xs text-text-secondary">불러오는 중...</p>}

      {!isLoading && (!questions || questions.length === 0) && !adding && (
        <p className="text-xs text-text-secondary">등록된 문제가 없습니다.</p>
      )}

      <div className="flex flex-col gap-2">
        {questions?.map((q) => (
          <ConceptQuestionItem
            key={q.id}
            question={q}
            onDelete={() => handleDelete(q.id)}
            onUpdate={(values) => handleUpdate(q.id, values)}
            readOnly={readOnly}
          />
        ))}
      </div>

      {!readOnly && adding && (
        <div className="flex flex-col gap-2 rounded-sm border border-border bg-bg p-3">
          <Textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="문제"
            rows={2}
          />
          <Textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="해설"
            rows={2}
          />
          <Textarea
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            placeholder="메모 (선택)"
            rows={1}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setNewQuestion("");
                setNewAnswer("");
                setNewMemo("");
              }}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
            >
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConceptQuestionItem({
  question,
  onDelete,
  onUpdate,
  readOnly,
}: {
  question: ConceptQuestion;
  onDelete: () => void;
  onUpdate: (values: { question: string; answer: string; memo: string | null }) => Promise<void>;
  readOnly: boolean;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState(question.question);
  const [editAnswer, setEditAnswer] = useState(question.answer);
  const [editMemo, setEditMemo] = useState(question.memo ?? "");
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setEditQuestion(question.question);
    setEditAnswer(question.answer);
    setEditMemo(question.memo ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!editQuestion.trim() || !editAnswer.trim()) return;
    setSaving(true);
    try {
      await onUpdate({
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
        memo: editMemo.trim() || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-sm border border-border bg-bg p-3">
        <Textarea value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} placeholder="문제" rows={3} />
        <Textarea value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} placeholder="해설" rows={3} />
        <Textarea
          value={editMemo}
          onChange={(e) => setEditMemo(e.target.value)}
          placeholder="메모 (선택)"
          rows={1}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
            취소
          </Button>
          <Button
            type="button"
            onClick={saveEdit}
            disabled={saving || !editQuestion.trim() || !editAnswer.trim()}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-border bg-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="whitespace-pre-wrap text-sm text-text-primary">{question.question}</p>
        {!readOnly && (
          <div className="-m-2 flex shrink-0 items-center">
            <button
              type="button"
              onClick={startEdit}
              aria-label="문제 수정"
              className="flex h-10 w-10 items-center justify-center text-text-secondary hover:text-accent"
            >
              <Pencil size={15} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="문제 삭제"
              className="flex h-10 w-10 items-center justify-center text-text-secondary hover:text-status-unknown"
            >
              <Trash2 size={15} strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAnswer((v) => !v)}
        className="-ml-2 mt-1 flex h-10 items-center gap-1 px-2 text-xs font-medium text-accent"
      >
        {showAnswer ? <ChevronDown size={14} strokeWidth={1.75} /> : <ChevronRight size={14} strokeWidth={1.75} />}
        해설 보기
      </button>

      {showAnswer && (
        <div className="mt-2 flex flex-col gap-1 rounded-sm bg-accent-soft p-2.5">
          <p className="whitespace-pre-wrap text-sm text-text-primary">{question.answer}</p>
          {question.memo && (
            <p className="whitespace-pre-wrap text-xs text-text-secondary">{question.memo}</p>
          )}
        </div>
      )}
    </div>
  );
}
