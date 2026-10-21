import Link from "next/link";
import type { ReactNode } from "react";

const STYLES = {
  primary: "bg-glow text-abyss hover:brightness-110",
  secondary: "border border-foam/40 text-foam hover:bg-white/10",
  light: "bg-foam text-abyss hover:brightness-95",
} as const;

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: keyof typeof STYLES }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-14 items-center justify-center rounded-2xl px-8 text-lg font-bold transition ${STYLES[variant]}`}
    >
      {children}
    </Link>
  );
}
