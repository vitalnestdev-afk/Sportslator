import { notFound } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { SplitHero } from "@/components/SplitHero";
import { VoteButtons } from "@/components/VoteButtons";
import { Comments } from "@/components/Comments";
import { ShareButton } from "@/components/ShareButton";
import { getComparison } from "@/lib/queries";
import { DIMENSION_ORDER, DIMENSION_LABELS, entityDisplayName } from "@/lib/types";
import type { Metadata } from "next";

export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getComparison(slug);
  if (!c) return {};
  const title = `${entityDisplayName(c.entity_a)} ≈ ${entityDisplayName(c.entity_b)} — Sportslator`;
  return {
    title,
    description: c.verdict_text,
    openGraph: {
      title,
      description: c.verdict_text,
      images: [{ url: `/c/${slug}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;
  const c = await getComparison(slug);
  if (!c) notFound();

  const dims = DIMENSION_ORDER.map((d) => ({
    key: d,
    text: c.dimensions.find((x) => x.dimension === d)?.rationale_text,
  })).filter((d) => d.text);

  return (
    <>
      <Masthead />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 flex-1">
        <div className="mt-6">
          <SplitHero a={c.entity_a} b={c.entity_b} animate />
        </div>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">{c.verdict_text}</p>
            {c.status === "seed" && (
              <p className="font-score text-xs text-ink/50 mt-1">
                house take — written to be argued with
              </p>
            )}
          </div>
          <ShareButton slug={slug} />
        </div>

        <div className="mt-6">
          <VoteButtons
            comparisonId={c.id}
            agrees={c.agrees}
            disagrees={c.disagrees}
          />
        </div>

        <dl className="mt-8 space-y-4">
          {dims.map((d) => (
            <div key={d.key} className="border-b border-line pb-3">
              <dt className="font-score text-xs uppercase tracking-wider text-pitch">
                {DIMENSION_LABELS[d.key]}
              </dt>
              <dd className="mt-1">{d.text}</dd>
            </div>
          ))}
        </dl>

        <Comments comparisonId={c.id} />
      </main>
    </>
  );
}
