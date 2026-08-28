"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DomainTabItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * 전공수학 / 교육학 / 수학교육 각 영역에 들어왔을 때
 * 그 영역 안의 기능(과목, 문제, 연습, 시험 등)을 전환하는 탭입니다.
 * 영역을 벗어나는 이동(다른 영역으로 가기)은 Sidebar/MobileNav가 담당하고,
 * 이 탭은 항상 "선택한 영역 안"에서만 동작합니다.
 */
export function DomainTabs({
  domainLabel,
  items,
}: {
  domainLabel: string;
  items: DomainTabItem[];
}) {
  const pathname = usePathname();

  return (
    <div className="mb-6">
      <h1 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
        {domainLabel}
      </h1>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors",
                active
                  ? "border-accent font-medium text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              <Icon size={15} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
