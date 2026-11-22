// Profile codes (F1.3): 8 characters from an alphabet without 0, O, 1, I or L, shown as two
// groups of four. Bytes past the largest multiple of the alphabet size are redrawn, so every
// character is equally likely.
export const codeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const codeLength = 8;
const limit = 256 - (256 % codeAlphabet.length);

export function newProfileCode(randomBytes: (n: number) => Uint8Array = defaultBytes) {
  let code = "";
  while (code.length < codeLength) {
    for (const byte of randomBytes(codeLength)) {
      if (byte < limit && code.length < codeLength)
        code += codeAlphabet[byte % codeAlphabet.length];
    }
  }
  return code;
}

function defaultBytes(n: number) {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Upper case, without spaces or dashes; null unless it could be a code. */
export function parseProfileCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return code.length === codeLength && [...code].every((c) => codeAlphabet.includes(c))
    ? code
    : null;
}

export function formatProfileCode(code: string) {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}
