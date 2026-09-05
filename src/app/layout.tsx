import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { PlannerProvider } from "@/components/PlannerState";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ShiftCraft — explainable workforce planning",
    template: "%s · ShiftCraft",
  },
  description:
    "Build, inspect, and repair an explainable schedule for the synthetic Harbour & Pine Café.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-scroll-behavior="smooth">
      <body>
        <PlannerProvider>
          <AppShell>{children}</AppShell>
        </PlannerProvider>
      </body>
    </html>
  );
}
