import { SessionSetupForm } from "@/components/math/session-setup-form";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">연습 모드</h2>
        <p className="mt-1 text-sm text-text-secondary">
          범위를 설정하고 한 문제씩 풀며 이해도를 기록하세요.
        </p>
      </div>
      <SessionSetupForm mode="practice" />
    </div>
  );
}
