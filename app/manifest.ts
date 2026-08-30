import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "임용고시 학습 시스템",
    short_name: "임용학습",
    description: "전공수학 · 교육학 · 수학교육 개인 학습 관리",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#1f3a5f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
