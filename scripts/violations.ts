import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";
import { log } from "@/lib/log";
import { placeSchema } from "@/lib/places/types";
import {
  checkRewrite,
  cityWords,
  violationMaxLength,
  violationsFileSchema,
  type ViolationsFile,
} from "@/lib/violations";

// pnpm data:violations: one plain-English line per distinct city violation description in
// places.json (F11.2, DATA 2, item 8). Run data:grades first. Answers are cached under
// .cache/violations/ by model and prompt, so a rerun makes no new calls, and descriptions that
// already have a rewrite keep it. Gemini needs GOOGLE_GENERATIVE_AI_API_KEY, loaded from .env.

const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const cacheDir = ".cache/violations";
const attempts = 3;
const output = "data/violations.json";

const instructions = `You rewrite one Boston restaurant inspection violation in plain English for college students.
Rules:
- Say what the inspector found wrong, using only what the city's words say. Add nothing.
- One plain sentence, ${violationMaxLength} characters or fewer, ending with a period.
- Start with a short noun phrase or a verb, for example "Food stored where it could get contaminated."
- No opinions, no judgment of the restaurant, no em dashes, no exclamation marks.
Reply with the sentence only.`;

const read = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"));

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function readExisting(): Promise<ViolationsFile> {
  const text = await readText(output);
  return text === null ? { model, rewrites: {} } : violationsFileSchema.parse(JSON.parse(text));
}

async function ask(prompt: string): Promise<string> {
  await mkdir(cacheDir, { recursive: true });
  const key = createHash("sha256").update(`${model}\n${instructions}\n${prompt}`).digest("hex");
  const file = `${cacheDir}/${key.slice(0, 16)}.txt`;
  const cached = await readText(file);
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

const places = z.array(placeSchema).parse(await read("data/places.json"));
const texts = [
  ...new Set(places.flatMap((p) => (p.grade ? p.grade.violations.map((v) => v.text) : []))),
].sort();
const existing = await readExisting();
const rewrites: Record<string, string> = {};
const rejected: string[] = [];
let missing = 0;

for (const text of texts) {
  const kept = existing.rewrites[text];
  if (kept !== undefined && checkRewrite(kept, cityWords(text)) === null) {
    rewrites[text] = kept;
    continue;
  }
  const source = cityWords(text);
  let problem = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let sentence: string;
    try {
      sentence = await ask(`City's words: ${source}${problem}`);
    } catch (error) {
      if (error instanceof Error && unavailable.has(error.name)) {
        missing++;
        log.info("data:violations got no answer from Gemini; rerun to fill it", {
          text,
          reason: error.name,
        });
        break;
      }
      throw error;
    }
    const why = checkRewrite(sentence, source);
    if (why === null) {
      rewrites[text] = sentence.trim();
      break;
    }
    problem = `\n\nYour last sentence was rejected (${why}). Write a new one that follows every rule.`;
    if (attempt === attempts) rejected.push(text);
  }
}

await writeFile(output, `${JSON.stringify({ model, rewrites }, null, 2)}\n`);
log.info("data:violations wrote data/violations.json", {
  model,
  descriptions: texts.length,
  rewritten: Object.keys(rewrites).length,
  rejected: rejected.length,
  geminiUnavailable: missing,
});
