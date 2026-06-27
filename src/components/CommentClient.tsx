"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ensureUser } from "@/lib/ensure-user";

export function CommentForm({
  comparisonId,
  parentId,
  compact = false,
}: {
  comparisonId: string;
  parentId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(!compact);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const user = await ensureUser();
    if (!user) {
      router.push(`/signin?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const { error } = await supabase.from("comments").insert({
      comparison_id: comparisonId,
      user_id: user.id,
      body: body.trim(),
      parent_id: parentId ?? null,
    });
    if (error) setError(error.message);
    else {
      setBody("");
      if (compact) setOpen(false);
      router.refresh();
    }
    setBusy(false);
  }

  if (compact && !open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-score text-xs underline text-ink/60 hover:text-pitch mt-1"
      >
        reply
      </button>
    );

  return (
    <form onSubmit={submit} className={compact ? "mt-2 flex gap-2" : "flex gap-2"}>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={2000}
        placeholder={compact ? "Your reply" : "Have it out. Keep it about the football."}
        className="flex-1 border-2 border-ink bg-whitewash px-3 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
      />
      <button
        disabled={busy || !body.trim()}
        className="font-display bg-ink text-whitewash px-4 py-2 rounded-[2px] hover:bg-pitch disabled:opacity-40"
      >
        {compact ? "Reply" : "Shout"}
      </button>
      {error && <p className="text-cardred text-sm self-center">{error}</p>}
    </form>
  );
}

export function ReportButton({ commentId }: { commentId: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      disabled={done}
      onClick={async () => {
        await supabaseBrowser().rpc("report_comment", { comment_id: commentId });
        setDone(true);
      }}
      className="font-score text-[10px] text-ink/40 underline hover:text-cardred disabled:no-underline"
      title="Report this comment"
    >
      {done ? "reported" : "report"}
    </button>
  );
}
