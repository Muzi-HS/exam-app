"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <AlertTriangle size={40} strokeWidth={1.5} className="text-status-unknown" />
      <div>
        <h1 className="text-lg font-semibold text-text-primary">문제가 발생했습니다</h1>
        <p className="mt-1 text-sm text-text-secondary">
          일시적인 오류일 수 있습니다. 다시 시도해 주세요.
        </p>
      </div>
      <Button type="button" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
