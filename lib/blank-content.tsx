import { cn } from "@/lib/utils";

// 정답을 빈칸 순서대로 한 줄에 하나씩 적도록 하고, 저장할 때 배열로 바꿉니다.
export function blanksToText(blanks: string[]): string {
  return blanks.join("\n");
}
export function textToBlanks(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// 본문 안의 빈 줄(문단 구분)로 블록을 나누고, "|"로 시작·끝나는 줄들만 있으면
// 표로 인식합니다. 문단과 표를 섞어 쓸 수 있습니다.
export type ContentBlock = { type: "p"; text: string } | { type: "table"; rows: string[][] };

const SEPARATOR_ROW = /^:?-{2,}:?$/;

export function parseBlocks(text: string): ContentBlock[] {
  return text
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const isTable = lines.length > 1 && lines.every((l) => l.startsWith("|") && l.endsWith("|"));
      if (!isTable) return { type: "p" as const, text: chunk };
      const rows = lines
        .map((l) =>
          l
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim())
        )
        .filter((cells) => !cells.every((c) => SEPARATOR_ROW.test(c)));
      return { type: "table" as const, rows };
    });
}

// "___"를 등장 순서대로 고유 인덱스가 붙은 표식으로 바꿔서, 문단/표 어디에 있든
// blanks 배열과 정확히 같은 순서로 매칭되게 합니다.
export function indexBlanks(text: string): string {
  let i = 0;
  return text.replace(/___/g, () => ` ${i++} `);
}

export function renderTextWithBlanks(
  text: string,
  blanks: string[],
  revealed: Set<number>,
  onToggle: (i: number) => void
): React.ReactNode[] {
  return text.split(/ (\d+) /).map((part, i) => {
    if (i % 2 === 0) return part;
    const blankIndex = Number(part);
    return (
      <button
        key={i}
        type="button"
        onClick={() => onToggle(blankIndex)}
        aria-label={revealed.has(blankIndex) ? "정답 가리기" : "정답 보기"}
        className={cn(
          "mx-0.5 inline-flex h-[2em] min-w-[3.5em] items-center justify-center rounded-sm border px-2 align-middle text-base font-medium transition-colors",
          revealed.has(blankIndex)
            ? "border-accent bg-accent-soft text-accent"
            : "border-dashed border-border bg-bg hover:border-accent"
        )}
      >
        {revealed.has(blankIndex) ? blanks[blankIndex] ?? "?" : " "}
      </button>
    );
  });
}
