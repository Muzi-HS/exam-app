import { ProblemForm } from "@/components/math/problem-form";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">문제 등록</h2>
        <p className="mt-1 text-sm text-text-secondary">
          과목과 단원을 선택하고 문제 이미지를 등록하세요.
        </p>
      </div>
      <ProblemForm />
    </div>
  );
}
