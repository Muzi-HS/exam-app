"use client";

import { Network, PenLine, Timer } from "lucide-react";
import { DomainTabs } from "@/components/layout/domain-tabs";

const TABS = [
  { href: "/pedagogy/topics", label: "주제", icon: Network },
  { href: "/pedagogy/practice", label: "연습", icon: PenLine },
  { href: "/pedagogy/exam", label: "시험", icon: Timer },
];

export default function PedagogyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <DomainTabs domainLabel="교육학" items={TABS} />
      {children}
    </div>
  );
}
