import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { recap as copy, system } from "@/copy";
import { recapForPlan } from "@/server/actions/recap";
import { recapCard } from "@/server/recap-card";
import { shareColors as c } from "@/styles/share-colors";

// F9.3: the night recap as a 1080×1350 share image, with the same facts as the recap page. Only
// participants get it (F9.4): the browser sends the session cookie when the page fetches it to
// share or download. Satori can't read CSS variables or Tailwind classes, so sizes are literal
// and colors come from share-colors (D-069). Titles, names and the spot line are clamped and the
// badge list is capped, so nothing runs off the canvas. The worst case fills it exactly: any added
// height (another stat row, bigger chips) clips the badges again.

const size = { width: 1080, height: 1350 };
const weights = [400, 700, 800] as const;
const fonts = await Promise.all(
  weights.map(async (weight) => ({
    name: "Hanken Grotesk",
    weight,
    style: "normal" as const,
    data: await readFile(join(process.cwd(), `assets/fonts/hanken-grotesk-${weight}.ttf`)),
  })),
);
const oneLine = {
  display: "block",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
} as const;

export async function GET(_: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const night = await recapForPlan(planId);
  if (!night) return new Response(null, { status: 404 });
  const card = recapCard(night);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 32,
        padding: 64,
        background: c.bg,
        color: c.ink,
        fontFamily: "Hanken Grotesk",
        fontSize: 36,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>
            {copy.brand}
          </div>
          {card.demo && (
            <div
              style={{
                display: "flex",
                padding: "4px 16px",
                borderRadius: 999,
                background: c.sunken,
                color: c.inkMuted,
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {system.demo}
            </div>
          )}
        </div>
        <div
          style={{
            display: "block",
            lineClamp: 2,
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1.5,
          }}
        >
          {card.title}
        </div>
        <div style={{ ...oneLine, color: c.inkMuted }}>{card.dateLine}</div>
      </div>

      {card.podium.length === 0 ? (
        <div style={{ display: "flex", color: c.inkMuted }}>{copy.noArrivals}</div>
      ) : (
        <div style={{ display: "flex", gap: 24 }}>
          {card.podium.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minWidth: 0,
                gap: 8,
                padding: 28,
                borderRadius: 32,
                background: i === 0 ? c.accent : c.surface,
                color: i === 0 ? c.surface : c.ink,
              }}
            >
              <div style={{ display: "flex", fontSize: 28 }}>{a.place}</div>
              <div style={{ ...oneLine, fontSize: 40, fontWeight: 800 }}>{a.name}</div>
              <div style={{ display: "flex", fontSize: 32 }}>{a.time}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        {card.stats.map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              flexDirection: "column",
              width: 464,
              padding: 24,
              borderRadius: 24,
              background: c.sunken,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              {s.prefix && <div style={{ display: "flex", fontSize: 32 }}>{s.prefix}</div>}
              <div style={{ display: "flex", fontSize: 88, fontWeight: 800 }}>{s.value}</div>
              {s.unit && (
                <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>{s.unit}</div>
              )}
            </div>
            <div style={{ display: "flex", fontSize: 28, color: c.inkMuted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {card.chips.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>{copy.badgesHeading}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {card.chips.map((chip, i) => (
              <div
                key={i}
                style={{
                  ...oneLine,
                  maxWidth: 454,
                  padding: "10px 24px",
                  borderRadius: 999,
                  background: c.surface,
                  fontSize: 28,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>,
    { ...size, fonts, headers: { "cache-control": "private, no-store" } },
  );
}
