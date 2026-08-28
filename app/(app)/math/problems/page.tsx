import { EmptyState } from "@/components/ui/empty-state";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-text-primary">문제 목록</h2>
      <EmptyState
        title="아직 구현되지 않았습니다"
        description="Phase 2~3에서 문제 등록, 검색, 필터 기능이 추가됩니다."
      />
    </div>
  );
}
