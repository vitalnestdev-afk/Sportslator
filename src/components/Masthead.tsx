import Link from "next/link";
import { AuthStatus } from "./AuthStatus";

export function Masthead() {
  return (
    <header className="border-b-2 border-ink">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-baseline justify-between gap-4">
        <Link href="/" className="font-display text-2xl tracking-wide">
          Sportslator
        </Link>
        <span className="font-score text-xs text-ink/60 hidden sm:inline">
          12 sports · 800+ clubs · 120k stars
        </span>
        <nav className="flex items-center gap-4">
          <Link href="/takes" className="font-score text-xs underline hover:text-pitch">
            takes
          </Link>
          <Link href="/players" className="font-score text-xs underline hover:text-pitch">
            stars
          </Link>
          <Link href="/my/takes" className="font-score text-xs underline hover:text-pitch">
            my takes
          </Link>
          <Link href="/propose" className="font-score text-xs underline hover:text-pitch">
            new take
          </Link>
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
