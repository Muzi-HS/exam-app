"use client";

import { useState } from "react";
import { ConceptSessionSetupForm } from "@/components/mindmap/concept-session-setup-form";
import { SessionHistoryList } from "@/components/math/session-history-list";
import { cn } from "@/lib/utils";
import type { MindmapDomain } from "@/types/database";

export function ConceptExamPage({ domain }: { domain: MindmapDomain }) {
  const [tab, setTab] = useState<"new" | "history">("new");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">시험 모드</h2>
        <p className="mt-1 text-sm text-text-secondary">
          주제를 선택해 실전처럼 풀거나, 지난 기록을 확인하세요.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("new")}
          className={cn(
            "border-b-2 px-3 py-2 text-sm transition-colors",
            tab === "new"
              ? "border-accent font-medium text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          새 시험
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={cn(
            "border-b-2 px-3 py-2 text-sm transition-colors",
            tab === "history"
              ? "border-accent font-medium text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          기록
        </button>
      </div>

      {tab === "new" ? (
        <ConceptSessionSetupForm domain={domain} mode="exam" />
      ) : (
        <SessionHistoryList domain={domain} modeFilter="exam" />
      )}
    </div>
  );
}
