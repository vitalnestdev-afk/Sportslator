"use client";
import { useState } from "react";

export function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        const url = `${location.origin}/c/${slug}`;
        if (navigator.share) {
          try { await navigator.share({ url }); return; } catch { /* fall through */ }
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="font-score text-xs border-2 border-ink px-3 py-1.5 rounded-[2px] hover:border-pitch hover:text-pitch"
    >
      {copied ? "copied — go start an argument" : "share this take"}
    </button>
  );
}
