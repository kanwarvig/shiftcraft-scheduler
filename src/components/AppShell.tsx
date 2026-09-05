"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usePlanner } from "@/components/PlannerState";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/planner", label: "Plan" },
  { href: "/schedule", label: "Schedule" },
  { href: "/scenarios", label: "Cases" },
  { href: "/evidence", label: "Evidence" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { reset, announcement } = usePlanner();

  return (
    <div className="site-shell">
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="ShiftCraft overview">
          <span className="brand-mark">SC</span>
          <span><b>ShiftCraft</b><small>Workforce planning lab</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>
          ))}
        </nav>
        <div className="header-meta">
          <span className="synthetic-pill">SYNTHETIC DATA</span>
          <button className="quiet-button" type="button" onClick={reset}>Reset session</button>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <span>ShiftCraft · Harbour &amp; Pine Café</span>
        <span>Synthetic operations fixture · Session-only browser state</span>
        <a href="https://github.com/kanwarvig/shiftcraft-scheduler" target="_blank" rel="noreferrer">Source ↗</a>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
            <span aria-hidden="true">{item.href === "/" ? "⌂" : item.href === "/planner" ? "＋" : item.href === "/schedule" ? "▦" : item.href === "/scenarios" ? "◇" : "≋"}</span>{item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
