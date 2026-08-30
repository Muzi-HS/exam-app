// 과목별 색상 팔레트. Tailwind는 클래스명을 소스에서 정적으로 스캔하므로
// `text-subject-${i}` 같은 동적 조합은 인식하지 못합니다. 그래서 실제 클래스명
// 문자열을 이 배열에 그대로 나열해두고, order_index로 인덱스만 순환시킵니다.
export interface SubjectColor {
  text: string;
  border: string;
  soft: string;
}

const SUBJECT_PALETTE: SubjectColor[] = [
  { text: "text-subject-1", border: "border-subject-1", soft: "bg-subject-1-soft" },
  { text: "text-subject-2", border: "border-subject-2", soft: "bg-subject-2-soft" },
  { text: "text-subject-3", border: "border-subject-3", soft: "bg-subject-3-soft" },
  { text: "text-subject-4", border: "border-subject-4", soft: "bg-subject-4-soft" },
  { text: "text-subject-5", border: "border-subject-5", soft: "bg-subject-5-soft" },
  { text: "text-subject-6", border: "border-subject-6", soft: "bg-subject-6-soft" },
  { text: "text-subject-7", border: "border-subject-7", soft: "bg-subject-7-soft" },
  { text: "text-subject-8", border: "border-subject-8", soft: "bg-subject-8-soft" },
  { text: "text-subject-9", border: "border-subject-9", soft: "bg-subject-9-soft" },
  { text: "text-subject-10", border: "border-subject-10", soft: "bg-subject-10-soft" },
  { text: "text-subject-11", border: "border-subject-11", soft: "bg-subject-11-soft" },
  { text: "text-subject-12", border: "border-subject-12", soft: "bg-subject-12-soft" },
];

export function getSubjectColor(orderIndex: number): SubjectColor {
  const len = SUBJECT_PALETTE.length;
  const i = ((orderIndex % len) + len) % len;
  return SUBJECT_PALETTE[i];
}

// 마인드맵 트리에서 깊이가 깊어질수록 "배경색만" 옅어지도록 쓰는 단계별 톤입니다.
// 글씨(text)와 테두리(border)는 가독성을 위해 깊이와 상관없이 항상 진한 기본 톤을 씁니다.
export interface BranchTone {
  text: string;
  border: string;
  bg: string;
}

const BG_TIER_1: string[] = [
  "bg-subject-1/10",
  "bg-subject-2/10",
  "bg-subject-3/10",
  "bg-subject-4/10",
  "bg-subject-5/10",
  "bg-subject-6/10",
  "bg-subject-7/10",
  "bg-subject-8/10",
  "bg-subject-9/10",
  "bg-subject-10/10",
  "bg-subject-11/10",
  "bg-subject-12/10",
];

const BG_TIER_2: string[] = [
  "bg-subject-1/5",
  "bg-subject-2/5",
  "bg-subject-3/5",
  "bg-subject-4/5",
  "bg-subject-5/5",
  "bg-subject-6/5",
  "bg-subject-7/5",
  "bg-subject-8/5",
  "bg-subject-9/5",
  "bg-subject-10/5",
  "bg-subject-11/5",
  "bg-subject-12/5",
];

export function getBranchTone(orderIndex: number, depth: number): BranchTone {
  const len = SUBJECT_PALETTE.length;
  const i = ((orderIndex % len) + len) % len;
  const base = SUBJECT_PALETTE[i];
  const bg = depth <= 0 ? base.soft : depth === 1 ? BG_TIER_1[i] : BG_TIER_2[i];
  return { text: base.text, border: base.border, bg };
}
