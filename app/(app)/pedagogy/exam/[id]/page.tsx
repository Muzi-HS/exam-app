"use client";

import { useParams } from "next/navigation";
import { ConceptExamSession } from "@/components/mindmap/concept-exam-session";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ConceptExamSession domain="pedagogy" sessionId={params.id} />;
}
