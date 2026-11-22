// Invite tokens (F4.8): 12 characters from 32 letters and digits, without I, O, 0 or 1.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function inviteToken(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}
