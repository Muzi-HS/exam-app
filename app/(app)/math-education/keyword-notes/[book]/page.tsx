"use client";

import { notFound, useParams } from "next/navigation";
import { KeywordNoteTopics, type KeywordNoteBook } from "@/components/math-education/keyword-note-topics";

const BOOK_LABELS: Record<KeywordNoteBook, string> = {
  kim: "빵꾸노트(김민아)",
  lee: "빵꾸노트(이지윤)",
};

export default function Page() {
  const params = useParams<{ book: string }>();
  const book = params.book as KeywordNoteBook;
  if (book !== "kim" && book !== "lee") notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{BOOK_LABELS[book]}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          주제를 누르면 책처럼 개념들을 이어서 볼 수 있습니다.
        </p>
      </div>
      <KeywordNoteTopics book={book} />
    </div>
  );
}
