"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const WEEKS = 53;
const CELL = 11;
const GAP = 3;
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월",
];

// 이해도를 체크(=문제를 풀었다고 기록)할 때마다 progress_history에 한 줄씩 쌓이므로,
// 하루치 개수를 GitHub 잔디처럼 색 진하기로 보여줍니다.
const LEVEL_CLASS = [
  "bg-bg border border-border",
  "bg-accent/20",
  "bg-accent/45",
  "bg-accent/70",
  "bg-accent",
];

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

function toLocalDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function StudyHeatmap() {
  const supabase = createClient();

  const today = useMemo(() => startOfDay(new Date()), []);
  // 오늘이 포함된 주가 마지막 열이 되도록, 그 주의 일요일에서 WEEKS-1주 전 일요일까지 그립니다.
  const gridStart = useMemo(() => {
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    const start = new Date(currentWeekStart);
    start.setDate(currentWeekStart.getDate() - (WEEKS - 1) * 7);
    return start;
  }, [today]);

  const { data: counts, isLoading, error } = useQuery({
    queryKey: ["study-heatmap", toLocalDateKey(gridStart)],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return new Map<string, number>();

      const { data: rows, error } = await supabase
        .from("progress_history")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("item_type", "math_problem")
        .gte("created_at", gridStart.toISOString());
      if (error) throw error;

      const map = new Map<string, number>();
      for (const row of rows ?? []) {
        const key = toLocalDateKey(new Date(row.created_at));
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return map;
    },
  });

  const weeks = useMemo(() => {
    const cols: { date: Date; key: string }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { date: Date; key: string }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + w * 7 + d);
        col.push({ date, key: toLocalDateKey(date) });
      }
      cols.push(col);
    }
    return cols;
  }, [gridStart]);

  // 그 주의 월요일이 매달 1~7일 사이에 있을 때만, 그리고 달이 바뀌는 시점에만 라벨을 답니다.
  const monthLabels = useMemo(
    () =>
      weeks.map((col, i) => {
        const monday = col[1].date;
        if (monday.getDate() > 7) return null;
        if (i === 0) return MONTH_LABELS[monday.getMonth()];
        const prevMonday = weeks[i - 1][1].date;
        return prevMonday.getMonth() !== monday.getMonth() ? MONTH_LABELS[monday.getMonth()] : null;
      }),
    [weeks]
  );

  const total = counts ? Array.from(counts.values()).reduce((a, b) => a + b, 0) : 0;

  if (error) {
    return (
      <EmptyState
        title="학습량을 불러오지 못했습니다"
        description="네트워크 상태를 확인하고 새로고침해 주세요."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs text-text-secondary">
        {isLoading ? "불러오는 중..." : `최근 1년간 ${total}회 (문제 풀이 · 이해도 체크)`}
      </p>

      <div className="overflow-x-auto pb-1">
        <div style={{ display: "flex", gap: GAP }}>
          <div style={{ display: "flex", flexDirection: "column", gap: GAP, marginTop: 16 }}>
            {DAY_LABELS.map((label, i) => (
              <span
                key={label}
                style={{ height: CELL, lineHeight: `${CELL}px` }}
                className="w-4 text-[10px] text-text-secondary"
              >
                {i % 2 === 1 ? label : ""}
              </span>
            ))}
          </div>

          <div>
            <div style={{ display: "flex", gap: GAP, height: 14 }}>
              {weeks.map((col, i) => (
                <span
                  key={col[0].key}
                  style={{ width: CELL }}
                  className="whitespace-nowrap text-[10px] text-text-secondary"
                >
                  {monthLabels[i] ?? ""}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: GAP }}>
              {weeks.map((col) => (
                <div key={col[0].key} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                  {col.map(({ date, key }) => {
                    const isFuture = date > today;
                    const count = counts?.get(key) ?? 0;
                    return (
                      <div
                        key={key}
                        title={isFuture ? undefined : `${key} · ${count}회`}
                        style={{ width: CELL, height: CELL }}
                        className={cn("rounded-[2px]", isFuture ? "bg-transparent" : LEVEL_CLASS[levelFor(count)])}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: GAP, marginTop: 6 }} className="items-center">
              <span className="text-[10px] text-text-secondary">적음</span>
              {LEVEL_CLASS.map((cls, i) => (
                <div key={i} style={{ width: CELL, height: CELL }} className={cn("rounded-[2px]", cls)} />
              ))}
              <span className="text-[10px] text-text-secondary">많음</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
