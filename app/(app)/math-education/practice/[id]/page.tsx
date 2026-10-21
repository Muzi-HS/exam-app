"use client";

import { useParams } from "next/navigation";
import { PastExamPracticeSession } from "@/components/math-education/past-exam-practice-session";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <PastExamPracticeSession id={params.id} />;
}
