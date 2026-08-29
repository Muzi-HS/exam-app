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
    match: (p: string) => p === "/math" || p.startsWith("/math/"),
  },
  {
    href: "/pedagogy/topics",
    label: "교육학",
    icon: GraduationCap,
    match: (p: string) => p === "/pedagogy" || p.startsWith("/pedagogy/"),
  },
  {
    href: "/math-education/topics",
    label: "수학교육",
    icon: Shapes,
    match: (p: string) => p === "/math-education" || p.startsWith("/math-education/"),
  },
  {
    href: "/settings",
    label: "설정",
    icon: Settings,
    match: (p: string) => p === "/settings" || p.startsWith("/settings/"),
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
              active ? "text-accent" : "text-text-secondary"
            )}
          >
            <Icon size={19} strokeWidth={active ? 2 : 1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
