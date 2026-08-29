"use client";

import { useParams } from "next/navigation";
import { ConceptPracticeSession } from "@/components/mindmap/concept-practice-session";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ConceptPracticeSession domain="pedagogy" sessionId={params.id} />;
}
