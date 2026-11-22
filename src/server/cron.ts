import { createHash, timingSafeEqual } from "node:crypto";

const digest = (text: string) => createHash("sha256").update(text).digest();

/**
 * Whether a request carries Vercel Cron's `Authorization: Bearer <CRON_SECRET>`. The comparison
 * takes the same time whatever the header holds (both sides are hashed to the same length first),
 * so the secret can't be guessed a character at a time. No secret configured means no access.
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(given), digest(`Bearer ${secret}`));
}
