import { PastExamForm } from "@/components/math-education/past-exam-form";

export default function Page({ params }: { params: { id: string } }) {
  return <PastExamForm id={params.id} />;
}
