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
];

export function getSubjectColor(orderIndex: number): SubjectColor {
  const len = SUBJECT_PALETTE.length;
  const i = ((orderIndex % len) + len) % len;
  return SUBJECT_PALETTE[i];
}
