import { supabaseServer } from "@/lib/supabase-server";
import { CommentForm, ReportButton } from "./CommentClient";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  profiles: { display_name: string } | null;
};

export async function Comments({ comparisonId }: { comparisonId: string }) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, parent_id, profiles(display_name)")
    .eq("comparison_id", comparisonId)
    .order("created_at", { ascending: true });

  const comments = (data ?? []) as unknown as CommentRow[];
  const top = comments.filter((c) => !c.parent_id);
  const replies = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-1">
        <h2 className="font-display text-xl">The terraces</h2>
        <span className="font-score text-xs text-ink/60">
          {comments.length} {comments.length === 1 ? "shout" : "shouts"}
        </span>
      </div>
      {top.length === 0 && (
        <p className="mt-4 text-ink/70">
          No one&apos;s challenged this take yet. Be the first to call it wrong.
        </p>
      )}
      <ul className="mt-4 space-y-4">
        {top.map((c) => (
          <li key={c.id} className="border-b border-line pb-3">
            <CommentBody c={c} comparisonId={comparisonId} canReply />
            {replies(c.id).length > 0 && (
              <ul className="mt-3 ml-6 space-y-3 border-l-2 border-line pl-4">
                {replies(c.id).map((r) => (
                  <li key={r.id}>
                    <CommentBody c={r} comparisonId={comparisonId} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <CommentForm comparisonId={comparisonId} />
      </div>
    </section>
  );
}

function CommentBody({
  c,
  comparisonId,
  canReply = false,
}: {
  c: CommentRow;
  comparisonId: string;
  canReply?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-score text-xs font-bold">
          {c.profiles?.display_name ?? "anon"}
        </span>
        <span className="font-score text-xs text-ink/40">
          {new Date(c.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
        <ReportButton commentId={c.id} />
      </div>
      <p className="mt-1">{c.body}</p>
      {canReply && <CommentForm comparisonId={comparisonId} parentId={c.id} compact />}
    </div>
  );
}
