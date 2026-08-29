import { SubjectsManager } from "@/components/math/subjects-manager";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">과목 관리</h2>
        <p className="mt-1 text-sm text-text-secondary">
          과목을 펼치면 단원을 관리할 수 있습니다. 드래그로 순서를 바꿀 수 있습니다.
        </p>
      </div>
      <SubjectsManager />
    </div>
  );
}
