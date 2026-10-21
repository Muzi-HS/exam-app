import { PastExamDetail } from "@/components/math-education/past-exam-detail";

export default function Page({ params }: { params: { id: string } }) {
  return <PastExamDetail id={params.id} />;
}
