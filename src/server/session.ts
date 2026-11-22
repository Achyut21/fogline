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

export async function startSession(id: string) {
  (await cookies()).set(cookieName, sign(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge,
  });
}
