"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDateTime } from "@/lib/format";

export function ProgressHistoryList({ problemId, limit }: { problemId: string; limit?: number }) {
  const supabase = createClient();

  const { data, isLoading } = useQuery({
    queryKey: ["progress-history", problemId, limit],
    queryFn: async () => {
      let query = supabase
        .from("progress_history")
        .select("id, status, created_at")
        .eq("item_type", "math_problem")
        .eq("item_id", problemId)
        .order("created_at", { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="text-xs text-text-secondary">불러오는 중...</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-xs text-text-secondary">아직 이해도 변경 이력이 없습니다.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {data.map((h) => (
        <li key={h.id} className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-text-secondary">{formatDateTime(h.created_at)}</span>
          <StatusPill status={h.status} />
        </li>
      ))}
    </ul>
  );
}
