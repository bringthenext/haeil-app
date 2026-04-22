// ─────────────────────────────────────────────────────────────────────────────
// useBreakpoint — 반응형 레이아웃 분기
// mobile  < 768px  → 하단 탭바, 단일 컬럼
// tablet  ≥ 768px  → 좌측 사이드바, 2컬럼
// desktop ≥ 1024px → 좌측 사이드바 넓게, 콘텐츠 max-width
// ─────────────────────────────────────────────────────────────────────────────

import { useWindowDimensions } from "react-native";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export function useBreakpoint(): {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
} {
  const { width } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= 1024 ? "desktop" : width >= 768 ? "tablet" : "mobile";

  return {
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
    width,
  };
}
