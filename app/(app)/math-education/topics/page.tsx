import { EmptyState } from "@/components/ui/empty-state";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-text-primary">주제 · 마인드맵</h2>
      <EmptyState
        title="아직 구현되지 않았습니다"
        description="Phase 4에서 마인드맵과 개념 관리 기능이 추가됩니다."
      />
    </div>
  );
}
