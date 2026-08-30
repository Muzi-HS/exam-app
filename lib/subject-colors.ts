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

// 마인드맵 트리에서 깊이가 깊어질수록 색이 옅어지도록 쓰는 단계별 톤입니다.
// depth 0(뿌리)은 SUBJECT_PALETTE와 같은 진한 톤, 1단계·2단계 이상은 아래 표를 씁니다.
export interface BranchTone {
  text: string;
  border: string;
  bg: string;
}

const BRANCH_TIER_1: BranchTone[] = [
  { text: "text-subject-1/80", border: "border-subject-1/55", bg: "bg-subject-1/10" },
  { text: "text-subject-2/80", border: "border-subject-2/55", bg: "bg-subject-2/10" },
  { text: "text-subject-3/80", border: "border-subject-3/55", bg: "bg-subject-3/10" },
  { text: "text-subject-4/80", border: "border-subject-4/55", bg: "bg-subject-4/10" },
  { text: "text-subject-5/80", border: "border-subject-5/55", bg: "bg-subject-5/10" },
  { text: "text-subject-6/80", border: "border-subject-6/55", bg: "bg-subject-6/10" },
  { text: "text-subject-7/80", border: "border-subject-7/55", bg: "bg-subject-7/10" },
  { text: "text-subject-8/80", border: "border-subject-8/55", bg: "bg-subject-8/10" },
  { text: "text-subject-9/80", border: "border-subject-9/55", bg: "bg-subject-9/10" },
  { text: "text-subject-10/80", border: "border-subject-10/55", bg: "bg-subject-10/10" },
  { text: "text-subject-11/80", border: "border-subject-11/55", bg: "bg-subject-11/10" },
  { text: "text-subject-12/80", border: "border-subject-12/55", bg: "bg-subject-12/10" },
];

const BRANCH_TIER_2: BranchTone[] = [
  { text: "text-subject-1/55", border: "border-subject-1/30", bg: "bg-subject-1/5" },
  { text: "text-subject-2/55", border: "border-subject-2/30", bg: "bg-subject-2/5" },
  { text: "text-subject-3/55", border: "border-subject-3/30", bg: "bg-subject-3/5" },
  { text: "text-subject-4/55", border: "border-subject-4/30", bg: "bg-subject-4/5" },
  { text: "text-subject-5/55", border: "border-subject-5/30", bg: "bg-subject-5/5" },
  { text: "text-subject-6/55", border: "border-subject-6/30", bg: "bg-subject-6/5" },
  { text: "text-subject-7/55", border: "border-subject-7/30", bg: "bg-subject-7/5" },
  { text: "text-subject-8/55", border: "border-subject-8/30", bg: "bg-subject-8/5" },
  { text: "text-subject-9/55", border: "border-subject-9/30", bg: "bg-subject-9/5" },
  { text: "text-subject-10/55", border: "border-subject-10/30", bg: "bg-subject-10/5" },
  { text: "text-subject-11/55", border: "border-subject-11/30", bg: "bg-subject-11/5" },
  { text: "text-subject-12/55", border: "border-subject-12/30", bg: "bg-subject-12/5" },
];

export function getBranchTone(orderIndex: number, depth: number): BranchTone {
  const len = SUBJECT_PALETTE.length;
  const i = ((orderIndex % len) + len) % len;
  if (depth <= 0) {
    const base = SUBJECT_PALETTE[i];
    return { text: base.text, border: base.border, bg: base.soft };
  }
  if (depth === 1) return BRANCH_TIER_1[i];
  return BRANCH_TIER_2[i];
}
