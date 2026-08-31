import { SubjectStats } from "@/components/math/subject-stats";
import { StudyHeatmap } from "@/components/math/study-heatmap";

export default function Page() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">통계</h2>
        <p className="mt-1 text-sm text-text-secondary">
          과목별 이해도 비율과 학습량을 확인할 수 있습니다.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">학습량</p>
        <StudyHeatmap />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">과목별 이해도 비율</p>
        <SubjectStats />
      </div>
    </div>
  );
}
