"use client";

import { useParams } from "next/navigation";
import { KeywordNotePage } from "@/components/math-education/keyword-note-page";

export default function Page() {
  const params = useParams<{ topicId: string }>();
  return <KeywordNotePage topicId={params.topicId} />;
}
