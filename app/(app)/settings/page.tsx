import { EmptyState } from "@/components/ui/empty-state";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text-primary">설정</h1>
      <EmptyState
        title="아직 구현되지 않았습니다"
        description="Phase 6에서 데이터 백업/Export, 계정 설정이 추가됩니다."
      />
    </div>
  );
}
