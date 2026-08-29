"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { MindmapView } from "@/components/mindmap/mindmap-view";
import type { MindmapDomain } from "@/types/database";

export function TopicMindmapPage({ domain, topicId }: { domain: MindmapDomain; topicId: string }) {
  const supabase = createClient();
  const basePath = domain === "pedagogy" ? "/pedagogy" : "/math-education";

  const { data: topic, isLoading, error } = useQuery({
    queryKey: ["mindmap-topic", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mindmap_topics")
        .select("id, name")
        .eq("id", topicId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`${basePath}/topics`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={15} strokeWidth={1.75} />
        주제 목록으로
      </Link>

      {isLoading ? (
        <p className="text-sm text-text-secondary">불러오는 중...</p>
      ) : error || !topic ? (
        <EmptyState
          title="주제를 찾을 수 없습니다"
          description="삭제되었거나 접근할 수 없는 주제입니다."
        />
      ) : (
        <>
          <h2 className="text-lg font-semibold text-text-primary">{topic.name}</h2>
          <MindmapView domain={domain} topicId={topicId} />
        </>
      )}
    </div>
  );
}
