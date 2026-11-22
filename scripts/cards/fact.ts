import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { bannedWords } from "@/lib/banned-words";
import { factMaxLength } from "@/lib/cards";

// One sentence per card from Gemini, using only the article's intro (DATA 2.4). Answers are
// cached under .cache/cards/ by model and prompt, so a rerun makes no new calls.
const cacheDir = ".cache/cards";
const attempts = 3;

// Periods that end an abbreviation, not a sentence ("St. Stephen's Church", "U.S. Army").
const abbreviations =
  /\b(?:St|Mt|Ft|Dr|Mr|Mrs|Ms|Jr|Sr|Rev|Gen|Gov|Ave|Co|Inc|No|U\.S|e\.g|i\.e|[A-Z])\./g;

const instructions = `You write one fact for a subway stop card in a Boston app for college students.
Rules:
- Use only facts stated in the article intro you are given. Add nothing from memory.
- One plain sentence, ${factMaxLength} characters or fewer, ending with a period.
- Concrete and specific: a date, a number, a name, or what the place is. Use only numbers written in the intro, as digits exactly as they appear there.
- No opinions, no praise, no marketing words, no em dashes, no exclamation marks.
- Don't start with the station's name or "This".
Reply with the sentence only.`;

const digits = (text: string) => text.replace(/(\d),(\d)/g, "$1$2");

/**
 * Why a sentence can't go on a card, or null when it can. Every number in it must appear in the
 * article's intro, so the AI adds no facts (CLAUDE.md, DATA 2.4).
 */
export function checkFact(sentence: string, extract: string): string | null {
  const s = sentence.trim();
  if (s.length === 0) return "empty";
  if (s.length > factMaxLength) return `${s.length} characters, over ${factMaxLength}`;
  if (!/[.]$/.test(s)) return "doesn't end with a period";
  const plain = s.slice(0, -1).replace(abbreviations, "");
  if (/[.!?]\s+[A-Z0-9]/.test(plain)) return "more than one sentence";
  if (/[—!]|\s–\s/.test(s)) return "has a dash between clauses or an exclamation mark";
  const word = bannedWords.exec(s);
  if (word) return `uses "${word[0]}"`;
  const source = digits(extract);
  const missing = (digits(s).match(/\d+/g) ?? []).find((n) => !source.includes(n));
  if (missing !== undefined) return `the number ${missing} isn't in the intro`;
  return null;
}

async function readCache(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function ask(model: string, prompt: string): Promise<string> {
  await mkdir(cacheDir, { recursive: true });
  const key = createHash("sha256").update(`${model}\n${instructions}\n${prompt}`).digest("hex");
  const file = `${cacheDir}/${key.slice(0, 16)}.txt`;
  const cached = await readCache(file);
  if (cached !== null) return cached;
  const { text } = await generateText({
    model: google(model),
    instructions,
    prompt,
    temperature: 0.2,
    maxRetries: 6,
    timeout: 120_000,
  });
  const sentence = text.trim();
  await writeFile(file, sentence);
  return sentence;
}

// The AI SDK's errors when Gemini is overloaded or slow: retries used up, or the call timed out.
const unavailable = new Set(["AI_RetryError", "AI_APICallError", "TimeoutError", "AbortError"]);

export type Fact =
  { kind: "ok"; sentence: string } | { kind: "rejected" } | { kind: "unavailable"; reason: string };

/**
 * A checked sentence about the article. "rejected" when Gemini gave none that passes `checkFact`
 * in 3 tries (each retry names the problem); "unavailable" when Gemini didn't answer, so a rerun
 * can try again (nothing is cached for it).
 */
export async function writeFact(model: string, title: string, extract: string): Promise<Fact> {
  let problem = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const prompt = `Article: ${title}\nIntro:\n${extract.trim()}${problem}`;
    let sentence: string;
    try {
      sentence = await ask(model, prompt);
    } catch (error) {
      if (error instanceof Error && unavailable.has(error.name)) {
        return { kind: "unavailable", reason: error.name };
      }
      throw error;
    }
    const why = checkFact(sentence, extract);
    if (why === null) return { kind: "ok", sentence };
    problem = `\n\nYour last sentence was rejected (${why}). Write a new one that follows every rule.`;
  }
  return { kind: "rejected" };
}
