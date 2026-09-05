"use client";

import { notFound, useParams } from "next/navigation";
import { KeywordNotePage } from "@/components/math-education/keyword-note-page";
import type { KeywordNoteBook } from "@/components/math-education/keyword-note-topics";

export default function Page() {
  const params = useParams<{ book: string; topicId: string }>();
  const book = params.book as KeywordNoteBook;
  if (book !== "kim" && book !== "lee") notFound();

  return <KeywordNotePage topicId={params.topicId} book={book} />;
}
