import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";
import { fgOn } from "@/lib/colors";

export const runtime = "nodejs";
export const alt = "Sportslator comparison card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: c } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!c) return new Response("Not found", { status: 404 });
  const { data: entities } = await supabase
    .from("entities")
    .select("*")
    .in("id", [c.entity_a_id, c.entity_b_id]);
  const a = entities?.find((e) => e.id === c.entity_a_id);
  const b = entities?.find((e) => e.id === c.entity_b_id);
  if (!a || !b) return new Response("Not found", { status: 404 });

  const fontDir = join(process.cwd(), "src/fonts");
  const [anton, mono] = await Promise.all([
    readFile(join(fontDir, "anton-latin-400-normal.woff")),
    readFile(join(fontDir, "space-mono-latin-700-normal.woff")),
  ]);

  const total = c.agrees + c.disagrees;
  const pct = total === 0 ? 50 : Math.round((c.agrees / total) * 100);
  const fgA = fgOn(a.primary_color);
  const fgB = fgOn(b.primary_color);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(102deg, ${a.primary_color} 0%, ${a.primary_color} 49.8%, ${b.primary_color} 50.2%, ${b.primary_color} 100%)`,
          fontFamily: "Anton",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 440,
              color: fgA,
            }}
          >
            <div style={{ width: 56, height: 8, background: a.secondary_color, marginBottom: 20 }} />
            <div style={{ fontSize: 72, lineHeight: 0.95, textTransform: "uppercase" }}>
              {a.name}
            </div>
          </div>
          <div style={{ fontSize: 110, color: "#fbfaf6", display: "flex", textShadow: "0 2px 0 #1a1e1c" }}>
            ≈
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              maxWidth: 440,
              color: fgB,
              textAlign: "right",
            }}
          >
            <div style={{ width: 56, height: 8, background: b.secondary_color, marginBottom: 20 }} />
            <div style={{ fontSize: 72, lineHeight: 0.95, textTransform: "uppercase" }}>
              {b.name}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#ebeae3",
            padding: "28px 64px 30px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#1a1e1c",
              fontFamily: "Anton",
              textTransform: "uppercase",
            }}
          >
            {c.verdict_text.length > 70 ? c.verdict_text.slice(0, 67) + "…" : c.verdict_text}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                height: 14,
                flex: 1,
                background: "#c9c7bd",
              }}
            >
              <div style={{ width: `${pct}%`, background: "#177a3d", display: "flex" }} />
              {total > 0 && <div style={{ flex: 1, background: "#c8102e", display: "flex" }} />}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Space Mono",
                fontSize: 22,
                color: "#1a1e1c",
                marginLeft: 20,
              }}
            >
              {total === 0 ? "NO VOTES YET — START IT" : `${c.agrees} AGREE · ${c.disagrees} DISAGREE`}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Space Mono",
                fontSize: 22,
                color: "#177a3d",
                marginLeft: 28,
              }}
            >
              SPORTSLATOR
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Anton", data: anton, style: "normal", weight: 400 },
        { name: "Space Mono", data: mono, style: "normal", weight: 700 },
      ],
    }
  );
}
