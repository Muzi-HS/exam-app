"use client";

import { Network, PenLine, Timer, BookOpen } from "lucide-react";
import { DomainTabs } from "@/components/layout/domain-tabs";

const TABS = [
  { href: "/math-education/topics", label: "주제", icon: Network },
  { href: "/math-education/keyword-notes/kim", label: "빵꾸노트(김민아)", icon: BookOpen },
  { href: "/math-education/keyword-notes/lee", label: "빵꾸노트(이지윤)", icon: BookOpen },
  { href: "/math-education/practice", label: "연습", icon: PenLine },
  { href: "/math-education/exam", label: "시험", icon: Timer },
];

export default function MathEducationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <DomainTabs domainLabel="수학교육" items={TABS} />
      {children}
    </div>
  );
}
