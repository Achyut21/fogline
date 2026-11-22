import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// The profile cookie (F1.2): the profile ID plus an HMAC of it under SESSION_SECRET. A missing or
// wrong signature counts as no profile.
const cookieName = "fogline_profile";
const maxAge = 60 * 60 * 24 * 400;

function mac(id: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(id).digest("base64url");
}

export function sign(id: string) {
  return `${id}.${mac(id)}`;
}

export function verify(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const id = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(mac(id));
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}

export async function sessionProfileId() {
  return verify((await cookies()).get(cookieName)?.value);
}

// A readable flag next to the profile cookie, so every screen can show the Demo chip (F16.3)
// without reading the session on the server. It only labels the screen; it grants nothing.
export const demoCookie = "fogline_demo";
const demoMaxAge = 60 * 60 * 24;

export async function startSession(id: string, demo = false) {
  const jar = await cookies();
  // A demo copy is deleted after 24 hours, so its session ends with it.
  jar.set(cookieName, sign(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge: demo ? demoMaxAge : maxAge,
  });
  if (demo) {
    jar.set(demoCookie, "1", {
      sameSite: "lax",
      secure: process.env.VERCEL === "1",
      path: "/",
      maxAge: demoMaxAge,
    });
  } else jar.delete(demoCookie);
}
