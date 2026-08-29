"use client";

import { useEffect, useState } from "react";

// PC는 캔버스형 마인드맵, 모바일은 들여쓰기 트리로 보여주기 위한 뷰포트 판단 훅.
export function useIsDesktop(breakpointPx = 768): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpointPx]);

  return isDesktop;
}
