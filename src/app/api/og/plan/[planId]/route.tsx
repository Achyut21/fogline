import { ImageResponse } from "next/og";
import { planImage as copy, system } from "@/copy";
import { planByInvite } from "@/server/actions/plans";
import { planPreview } from "@/server/plan-preview";
import { shareFonts } from "@/server/share-fonts";
import { shareColors as c } from "@/styles/share-colors";

// F4.8: the link preview for `/p/[planId]?t=[token]`, 1200×630. Link previews are fetched
// without cookies, so the token in the URL is what grants access; what it shows comes from
// planPreview. Sizes are literal and colors come from share-colors, since Satori can't read CSS
// variables (D-070).

const size = { width: 1200, height: 630 };
const oneLine = {
  display: "block",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const token = new URL(request.url).searchParams.get("t");
  const plan = token ? await planByInvite(token) : null;
  if (!plan || plan.id !== planId) return new Response(null, { status: 404 });

  const card = planPreview(plan);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: c.bg,
        color: c.ink,
        fontFamily: "Hanken Grotesk",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 800 }}>{copy.brand}</div>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "block",
            lineClamp: 2,
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1.5,
          }}
        >
          {card.title}
        </div>
        <div style={{ ...oneLine, fontSize: 40, color: c.inkMuted }}>{card.when}</div>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
            padding: 28,
            borderRadius: 28,
            background: c.surface,
          }}
        >
          <div style={{ ...oneLine, fontSize: 40, fontWeight: 800 }}>{card.spot}</div>
          {card.more && (
            <div style={{ display: "flex", fontSize: 28, color: c.inkMuted }}>{card.more}</div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: 28,
            borderRadius: 28,
            background: c.accent,
            color: c.surface,
            fontSize: 40,
            fontWeight: 800,
          }}
        >
          {card.going}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: shareFonts,
      // The preview changes as people join, so caches keep it only briefly.
      headers: { "cache-control": "public, max-age=300" },
    },
  );
}
