import Link from "next/link";
import { SITE } from "@/config/site";
import { MuteToggle } from "./MuteToggle";

const NAV = [
  { href: "/play/daily", label: "Daily" },
  { href: "/play/infinite", label: "Infinite" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/how-to-play", label: "How to play" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 sm:py-4">
      <Link href="/" className="font-[family-name:var(--font-display)] text-xl font-black tracking-[0.2em] text-foam">
        <span aria-hidden="true">🌊 </span>
        {SITE.name}
      </Link>
      <div className="sm:order-last">
        <MuteToggle />
      </div>
      <nav aria-label="Main" className="-mx-2 w-full overflow-x-auto sm:mx-0 sm:ml-auto sm:w-auto">
        <ul className="flex items-center gap-1 text-sm whitespace-nowrap">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block rounded-full px-2.5 py-2 text-mist hover:bg-white/10 hover:text-foam sm:px-3">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
