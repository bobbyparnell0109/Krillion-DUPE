import Link from "next/link";
import { SITE } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-5xl px-4 pb-10 text-sm text-mist">
      <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-6">
        <Link href="/play/daily" className="hover:text-foam">Daily Dive</Link>
        <Link href="/play/infinite" className="hover:text-foam">Infinite Dive</Link>
        <Link href="/how-to-play" className="hover:text-foam">How to play</Link>
        <Link href="/leaderboard" className="hover:text-foam">Leaderboard</Link>
        <Link href="/about" className="hover:text-foam">About</Link>
        <Link href="/privacy" className="hover:text-foam">Privacy</Link>
      </nav>
      <p className="mt-4">
        {SITE.name} is free, has no ads and needs no account. Made for curious minds.
      </p>
    </footer>
  );
}
