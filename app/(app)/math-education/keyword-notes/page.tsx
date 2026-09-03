import { KeywordNoteTopics } from "@/components/math-education/keyword-note-topics";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">빵꾸노트</h2>
        <p className="mt-1 text-sm text-text-secondary">
          주제를 누르면 책처럼 개념들을 이어서 볼 수 있습니다.
        </p>
      </div>
      <KeywordNoteTopics />
    </div>
  );
}
