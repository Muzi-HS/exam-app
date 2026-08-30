"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DataExport() {
  const supabase = createClient();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      const [
        subjects,
        topics,
        problems,
        tagsRes,
        problemTags,
        mindmapTopics,
        mindmapNodes,
        conceptQuestions,
        progressHistory,
        studySessions,
        studySessionItems,
        problemImages,
      ] = await Promise.all([
        supabase.from("math_subjects").select("*"),
        supabase.from("math_topics").select("*"),
        supabase.from("math_problems").select("*"),
        supabase.from("tags").select("*"),
        supabase.from("problem_tags").select("*"),
        supabase.from("mindmap_topics").select("*"),
        supabase.from("mindmap_nodes").select("*"),
        supabase.from("concept_questions").select("*"),
        supabase.from("progress_history").select("*"),
        supabase.from("study_sessions").select("*"),
        supabase.from("study_session_items").select("*"),
        supabase.from("problem_images").select("storage_path"),
      ]);

      const results = [
        subjects,
        topics,
        problems,
        tagsRes,
        problemTags,
        mindmapTopics,
        mindmapNodes,
        conceptQuestions,
        progressHistory,
        studySessions,
        studySessionItems,
        problemImages,
      ];
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        exported_at: new Date().toISOString(),
        user_email: user?.email ?? null,
        note:
          "이미지 파일 원본은 포함되어 있지 않습니다. Supabase 대시보드 Storage에서 problem-images 버킷을 별도로 백업해 주세요.",
        math_subjects: subjects.data,
        math_topics: topics.data,
        math_problems: problems.data,
        tags: tagsRes.data,
        problem_tags: problemTags.data,
        mindmap_topics: mindmapTopics.data,
        mindmap_nodes: mindmapNodes.data,
        concept_questions: conceptQuestions.data,
        progress_history: progressHistory.data,
        study_sessions: studySessions.data,
        study_session_items: studySessionItems.data,
        problem_images_storage_paths: (problemImages.data ?? []).map((i) => i.storage_path),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exam-app-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("내보내기에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-text-primary">데이터 내보내기</p>
        <p className="mt-1 text-sm text-text-secondary">
          과목·문제·마인드맵·학습 기록 등 내 데이터를 JSON 파일 하나로 내려받습니다. 이미지 파일
          원본은 포함되지 않으니(경로 목록만 포함), Supabase 대시보드의 Storage에서{" "}
          <code className="rounded bg-accent-soft px-1 py-0.5 font-mono text-xs text-accent">
            problem-images
          </code>{" "}
          버킷을 별도로 내려받아 두시길 권장합니다.
        </p>
      </div>
      {error && <p className="text-sm text-status-unknown">{error}</p>}
      <Button type="button" onClick={handleExport} disabled={exporting} className="self-start">
        <Download size={16} strokeWidth={1.75} />
        {exporting ? "내보내는 중..." : "내보내기"}
      </Button>
    </Card>
  );
}
