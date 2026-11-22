import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { badges as badgeCopy, recap as copy } from "@/copy";
import { recapForPlan } from "@/server/actions/recap";
import { shareColors as c } from "@/styles/share-colors";

// F9.3: the night recap as a 1080×1350 share image, with the same facts as the recap page. Only
// participants get it (F9.4): the browser sends the session cookie when the page fetches it to
// share or download.

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
const zone = "America/New_York";
const day = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  weekday: "short",
  month: "short",
  day: "numeric",
});
const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  hour: "numeric",
  minute: "2-digit",
});
const clockTime = (iso: string) => clock.format(new Date(iso)).replace(/\s(?=[AP]M)/u, " ");

function isBadge(id: string): id is keyof typeof badgeCopy {
  return id in badgeCopy;
}

export async function GET(_: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const night = await recapForPlan(planId);
  if (!night) return new Response(null, { status: 404 });

  const arrivals = night.arrivals;
  const podium =
    arrivals.length <= 3 ? arrivals : [arrivals[0], arrivals[1], arrivals[arrivals.length - 1]];
  const numbers = [
    [night.numbers.milesOnT.toFixed(1), copy.numbers.milesOnT],
    [night.numbers.milesWalked.toFixed(1), copy.numbers.milesWalked],
    [night.numbers.stops.toLocaleString("en-US"), copy.numbers.stops],
    [night.numbers.newCells.toLocaleString("en-US"), copy.numbers.newCells],
  ] as const;
  const awards = night.badges.flatMap((b) =>
    isBadge(b.badge) ? [`${badgeCopy[b.badge].name} · ${b.name}`] : [],
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 48,
        padding: 80,
        background: c.bg,
        color: c.ink,
        fontFamily: "Hanken Grotesk",
        fontSize: 36,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", fontSize: 32, color: c.accent, fontWeight: 700 }}>
          {copy.brand}
        </div>
        <div style={{ display: "flex", fontSize: 80, fontWeight: 800 }}>{night.title}</div>
        <div style={{ display: "flex", color: c.inkMuted }}>
          {`${day.format(new Date(night.startsAt))} · ${night.spot?.name ?? copy.spotHidden}`}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {podium.map((a, i) => (
          <div
            key={a.profileId}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 8,
              padding: 32,
              borderRadius: 32,
              background: i === 0 ? c.accent : c.surface,
              color: i === 0 ? c.surface : c.ink,
            }}
          >
            <div style={{ display: "flex", fontSize: 28 }}>{copy.places[i]}</div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>{a.name}</div>
            <div style={{ display: "flex", fontSize: 32 }}>{clockTime(a.at)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        {numbers.map(([value, label]) => (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              width: 448,
              padding: 32,
              borderRadius: 24,
              background: c.sunken,
            }}
          >
            <div style={{ display: "flex", fontSize: 72, fontWeight: 800 }}>{value}</div>
            <div style={{ display: "flex", fontSize: 28, color: c.inkMuted }}>{label}</div>
          </div>
        ))}
      </div>

      {awards.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>{copy.badgesHeading}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {awards.map((award) => (
              <div
                key={award}
                style={{
                  display: "flex",
                  padding: "12px 24px",
                  borderRadius: 999,
                  background: c.surface,
                  fontSize: 28,
                }}
              >
                {award}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>,
    { ...size, fonts, headers: { "cache-control": "private, no-store" } },
  );
}
