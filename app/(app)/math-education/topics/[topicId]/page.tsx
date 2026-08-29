"use client";

import { useParams } from "next/navigation";
import { TopicMindmapPage } from "@/components/mindmap/topic-mindmap-page";

export default function Page() {
  const params = useParams<{ topicId: string }>();
  return <TopicMindmapPage domain="math_education" topicId={params.topicId} />;
}
