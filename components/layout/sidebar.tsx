"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sigma, GraduationCap, Shapes, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/math/subjects",
    label: "전공수학",
    icon: Sigma,
    match: (p: string) => p.startsWith("/math"),
  },
  {
    href: "/pedagogy/topics",
    label: "교육학",
    icon: GraduationCap,
    match: (p: string) => p.startsWith("/pedagogy"),
  },
  {
    href: "/math-education/topics",
    label: "수학교육",
    icon: Shapes,
    match: (p: string) => p.startsWith("/math-education"),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="px-4 py-5">
        <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
          임용 학습
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-text-secondary hover:bg-accent-soft hover:text-text-primary"
              )}
            >
              <Icon size={17} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-2 pb-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors",
            pathname.startsWith("/settings")
              ? "bg-accent-soft font-medium text-accent"
              : "text-text-secondary hover:bg-accent-soft hover:text-text-primary"
          )}
        >
          <Settings size={17} strokeWidth={1.75} />
          설정
        </Link>
      </div>
    </aside>
  );
}
