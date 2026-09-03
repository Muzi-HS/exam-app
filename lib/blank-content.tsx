import katex from "katex";
import "katex/dist/katex.min.css";
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
// blanks 배열과 정확히 같은 순서로 매칭되게 합니다. 공백이 아니라 제어 문자()로
// 감싸는 이유: 표 셀을 나눌 때 parseBlocks가 trim()으로 셀 양 끝 공백을 지우는데,
// 빈칸이 셀 맨 끝(또는 시작)에 오면 예전엔 표식에 쓰던 공백까지 함께 잘려나가
// 숫자가 그대로 텍스트로 노출되는 문제가 있었습니다. 제어 문자는 trim()이
// 공백으로 취급하지 않으므로 셀 안 어느 위치에 있어도 안전합니다.
const BLANK_MARK = String.fromCharCode(1);
const BLANK_TOKEN_RE = new RegExp(`${BLANK_MARK}(\\d+)${BLANK_MARK}`);

export function indexBlanks(text: string): string {
  let i = 0;
  return text.replace(/___/g, () => `${BLANK_MARK}${i++}${BLANK_MARK}`);
}

// $$...$$ 는 별도 줄에 크게(수식 전용 줄), $...$ 는 문장 안에 인라인으로 렌더링합니다.
// KaTeX가 파싱하지 못하는 식은 throwOnError: false 덕분에 에러 대신 빨간 글씨로
// 표시되므로, 화면이 깨지는 대신 무엇이 잘못됐는지 바로 알 수 있습니다.
const MATH_RE = /(\$\$[^$]+\$\$|\$[^$]+\$)/g;

function renderMathText(text: string, keyPrefix: string | number): React.ReactNode[] {
  return text.split(MATH_RE).map((part, i) => {
    if (!part) return null;
    const isBlock = part.startsWith("$$") && part.endsWith("$$") && part.length > 3;
    const isInline = !isBlock && part.startsWith("$") && part.endsWith("$") && part.length > 1;
    if (!isBlock && !isInline) return part;
    const expr = isBlock ? part.slice(2, -2) : part.slice(1, -1);
    const html = katex.renderToString(expr, { throwOnError: false, displayMode: isBlock });
    return (
      <span
        key={`${keyPrefix}-math-${i}`}
        className={isBlock ? "my-1 block overflow-x-auto" : "inline-block"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

export function renderTextWithBlanks(
  text: string,
  blanks: string[],
  revealed: Set<number>,
  onToggle: (i: number) => void
): React.ReactNode[] {
  return text.split(BLANK_TOKEN_RE).flatMap((part, i) => {
    if (i % 2 === 0) return renderMathText(part, i);
    const blankIndex = Number(part);
    return (
      <button
        key={`blank-${i}`}
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
