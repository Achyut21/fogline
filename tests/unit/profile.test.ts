import { beforeAll, describe, expect, it } from "vitest";
import {
  codeAlphabet,
  formatProfileCode,
  newProfileCode,
  parseProfileCode,
} from "@/server/profile-code";
import { sign, verify } from "@/server/session";

const id = "0b5f1a5e-9a65-4c1e-8f5b-6f3f6b3d2a10";

describe("profile cookie", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = "unit-test-secret";
  });

  it("[F1.2] reads back the profile ID it signed", () => {
    expect(verify(sign(id))).toBe(id);
  });

  it("[F1.2] treats a missing, unsigned or tampered cookie as no profile", () => {
    const value = sign(id);
    const otherId = id.replace("0b5f", "1b5f");
    expect(verify(undefined)).toBeNull();
    expect(verify(id)).toBeNull();
    expect(verify(`${otherId}${value.slice(id.length)}`)).toBeNull();
    expect(verify(`${value.slice(0, -2)}xx`)).toBeNull();
  });
});

describe("profile code", () => {
  it("[F1.3] is 8 characters with no 0, O, 1, I or L", () => {
    for (let i = 0; i < 200; i++) {
      const code = newProfileCode();
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
      expect(code).not.toMatch(/[0O1IL]/);
    }
    expect(codeAlphabet).toHaveLength(31);
  });

  it("[F1.3] redraws bytes that would bias the alphabet", () => {
    const bytes = [255, 248, 0, 1, 2, 3, 4, 5, 6, 7];
    let next = 0;
    const code = newProfileCode((n) => new Uint8Array(n).map(() => bytes[next++ % bytes.length]));
    expect(code).toBe("23456789");
  });

  it("[F1.3] accepts a typed code with spaces, dashes or lower case, and rejects others", () => {
    expect(parseProfileCode(" k7rm-2qxw ")).toBe("K7RM2QXW");
    expect(parseProfileCode("K7RM 2QXW")).toBe("K7RM2QXW");
    expect(parseProfileCode("K7RM2QX")).toBeNull();
    expect(parseProfileCode("K7RM2QX0")).toBeNull();
    expect(formatProfileCode("K7RM2QXW")).toBe("K7RM 2QXW");
  });
});
