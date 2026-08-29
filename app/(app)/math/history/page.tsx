import { SubjectStats } from "@/components/math/subject-stats";
import { ProgressTimeline } from "@/components/math/progress-timeline";
import { SessionHistoryList } from "@/components/math/session-history-list";

export default function Page() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">통계</h2>
        <p className="mt-1 text-sm text-text-secondary">
          과목별 이해도 비율과 연습·시험 세션, 이해도 변경 이력을 확인할 수 있습니다.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">과목별 이해도 비율</p>
        <SubjectStats />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">연습 · 시험 세션</p>
        <SessionHistoryList />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">이해도 변경 이력</p>
        <ProgressTimeline />
      </div>
    </div>
  );
}
