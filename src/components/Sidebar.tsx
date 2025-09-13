"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface NavItem {
  href: string;
  label: string;
}

export default function Sidebar() {
  const pathname = usePathname();

  const items: NavItem[] = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/goals", label: "Goals" },
    ],
    []
  );

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1 p-3">
      <div className="px-2 py-3 text-xl font-semibold text-ctp-text">
        GoalForge
      </div>
      <div className="px-2 py-3 text-sm font-semibold tracking-wide uppercase text-ctp-subtext1">
        Navigation
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "block rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-ctp-surface0 text-ctp-text"
                    : "text-ctp-subtext0 hover:bg-ctp-surface0/60 hover:text-ctp-text",
                ].join(" ")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
