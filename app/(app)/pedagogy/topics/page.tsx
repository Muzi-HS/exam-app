import { TopicsManager } from "@/components/mindmap/topics-manager";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">주제 관리</h2>
        <p className="mt-1 text-sm text-text-secondary">
          주제를 추가하고, 화살표를 눌러 마인드맵을 열어보세요.
        </p>
      </div>
      <TopicsManager domain="pedagogy" />
    </div>
  );
}
