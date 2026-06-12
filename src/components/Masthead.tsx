import Link from "next/link";

export function Masthead() {
  return (
    <header className="border-b-2 border-ink">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-baseline justify-between gap-4">
        <Link href="/" className="font-display text-2xl tracking-wide">
          Sportslator
        </Link>
        <span className="font-score text-xs text-ink/60">
          football &harr; nba
        </span>
        {/* auth entry point lands in milestone 4 */}
        <span id="auth-slot" />
      </div>
    </header>
  );
}
