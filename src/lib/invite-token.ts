import { z } from "zod";

// Invite tokens (F4.8): 12 characters from 32 letters and digits, without I, O, 0 or 1.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function inviteToken(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

/** A real invite token, or the demo seed's (F16). */
export const inviteTokenInput = z.union([
  z.string().regex(/^[A-HJ-NP-Z2-9]{12}$/),
  z.string().regex(/^demo-(?:[2-9A-HJ-NP-Z]{16})$/),
]);
