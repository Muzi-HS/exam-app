import { ConceptSessionSetupForm } from "@/components/mindmap/concept-session-setup-form";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">연습 모드</h2>
        <p className="mt-1 text-sm text-text-secondary">
          주제를 설정하고 한 문제씩 확인하며 해설을 확인하세요.
        </p>
      </div>
      <ConceptSessionSetupForm domain="math_education" mode="practice" />
    </div>
  );
}
