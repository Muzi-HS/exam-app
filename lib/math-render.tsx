import katex from "katex";
import "katex/dist/katex.min.css";
import type { ReactNode } from "react";

// 전공수학(문제/메모/태그/단원명 등) 자유 텍스트 안에서 LaTeX 수식을 렌더링합니다.
// $$...$$ 는 별도 줄에 크게(수식 전용 줄), $...$ 는 문장 안에 인라인으로 표시됩니다.
// KaTeX가 파싱하지 못하는 식은 throwOnError: false 덕분에 에러 대신 빨간 글씨로
// 표시되므로, 화면이 깨지는 대신 무엇이 잘못됐는지 바로 알 수 있습니다.
const MATH_RE = /(\$\$[^$]+\$\$|\$[^$]+\$)/g;

// options.inlineOnly: true면 $$...$$ 로 써도 줄바꿈/스크롤 없이 한 줄짜리 작은
// 수식으로 렌더링합니다. 태그 칩처럼 좁고 낮은 자리에 수식을 넣을 때 사용합니다.
export function renderMath(
  text: string,
  keyPrefix: string | number = "m",
  options?: { inlineOnly?: boolean }
): ReactNode[] {
  return text.split(MATH_RE).flatMap<ReactNode>((part, i) => {
    if (!part) return [];
    const isDollarBlock = part.startsWith("$$") && part.endsWith("$$") && part.length > 3;
    const isDollarInline = !isDollarBlock && part.startsWith("$") && part.endsWith("$") && part.length > 1;
    if (!isDollarBlock && !isDollarInline) return [part];
    const expr = isDollarBlock ? part.slice(2, -2) : part.slice(1, -1);
    const isBlock = isDollarBlock && !options?.inlineOnly;
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

export function hasText(value?: string | null): value is string {
  return !!value && value.trim().length > 0;
}
