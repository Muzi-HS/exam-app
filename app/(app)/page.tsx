import Link from "next/link";
import { Sigma, GraduationCap, Shapes, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

async function getSummary() {
  const supabase = createClient();

  const [{ count: problemCount }, { count: pedagogyConcepts }, { count: mathEduConcepts }, { count: sessionCount }] =
    await Promise.all([
      supabase.from("math_problems").select("*", { count: "exact", head: true }),
      supabase
        .from("mindmap_nodes")
        .select("*", { count: "exact", head: true })
        .eq("domain", "pedagogy"),
      supabase
        .from("mindmap_nodes")
        .select("*", { count: "exact", head: true })
        .eq("domain", "math_education"),
      supabase.from("study_sessions").select("*", { count: "exact", head: true }),
    ]);

  return {
    problemCount: problemCount ?? 0,
    pedagogyConcepts: pedagogyConcepts ?? 0,
    mathEduConcepts: mathEduConcepts ?? 0,
    sessionCount: sessionCount ?? 0,
  };
}

interface DomainCard {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  stat: string;
}

export default async function DashboardPage() {
  const summary = await getSummary();

  const domains: DomainCard[] = [
    {
      href: "/math/subjects",
      label: "전공수학",
      description: "과목·소주제별 문제 은행, 연습과 시험",
      icon: Sigma,
      stat: `문제 ${summary.problemCount}개`,
    },
    {
      href: "/pedagogy/topics",
      label: "교육학",
      description: "마인드맵으로 정리하는 개념과 문제",
      icon: GraduationCap,
      stat: `개념 ${summary.pedagogyConcepts}개`,
    },
    {
      href: "/math-education/topics",
      label: "수학교육",
      description: "마인드맵으로 정리하는 개념과 문제",
      icon: Shapes,
      stat: `개념 ${summary.mathEduConcepts}개`,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">홈</h1>
        <p className="mt-1 text-sm text-text-secondary">
          공부할 영역을 선택하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {domains.map((d) => {
          const Icon = d.icon;
          return (
            <Link
              key={d.href}
              href={d.href}
              className="group rounded-md border border-border bg-surface p-5 transition-colors hover:border-accent"
            >
              <Icon size={22} strokeWidth={1.5} className="text-text-secondary group-hover:text-accent" />
              <p className="mt-3 text-base font-medium text-text-primary">{d.label}</p>
              <p className="mt-1 text-sm text-text-secondary">{d.description}</p>
              <p className="mt-4 font-mono text-xs text-text-secondary">{d.stat}</p>
            </Link>
          );
        })}
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
          전체 현황
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <p className="text-xs text-text-secondary">전공수학 문제</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-text-primary">
              {summary.problemCount}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary">교육학 개념</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-text-primary">
              {summary.pedagogyConcepts}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary">수학교육 개념</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-text-primary">
              {summary.mathEduConcepts}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary">누적 연습·시험</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-text-primary">
              {summary.sessionCount}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
