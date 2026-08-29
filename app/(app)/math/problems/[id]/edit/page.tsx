"use client";

import { useParams } from "next/navigation";
import { ProblemForm } from "@/components/math/problem-form";

export default function Page() {
  const params = useParams<{ id: string }>();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">문제 수정</h2>
        <p className="mt-1 text-sm text-text-secondary">
          과목, 단원, 이미지, 태그 등을 수정할 수 있습니다.
        </p>
      </div>
      <ProblemForm mode="edit" problemId={params.id} />
    </div>
  );
}
