"use client";

import { BookOpen, FileText, PenLine, Timer, BarChart3 } from "lucide-react";
import { DomainTabs } from "@/components/layout/domain-tabs";

const TABS = [
  { href: "/math/subjects", label: "과목", icon: BookOpen },
  { href: "/math/problems", label: "문제", icon: FileText },
  { href: "/math/practice", label: "연습", icon: PenLine },
  { href: "/math/exam", label: "시험", icon: Timer },
  { href: "/math/history", label: "통계", icon: BarChart3 },
];

export default function MathLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <DomainTabs domainLabel="전공수학" items={TABS} />
      {children}
    </div>
  );
}
