import { writeFile } from "node:fs/promises";
import { wordsFileSchema } from "@/lib/events";
import { log } from "@/lib/log";
import { wordLength } from "@/lib/puzzle";

// pnpm data:words: the valid guesses (F7.2), every 5-letter word in dwyl/english-words'
// words_alpha.txt (The Unlicense, public domain), pinned to one commit so a rerun gives the same
// file (DATA 2.7). Answers are the events' words, which data:events requires to be in this list.

const commit = "20f5cc9b3f0ccc8ce45d814c532b7c2031bba31c";
const source = `https://raw.githubusercontent.com/dwyl/english-words/${commit}/words_alpha.txt`;

const response = await fetch(source, { signal: AbortSignal.timeout(120_000) });
if (!response.ok) throw new Error(`${source} answered ${response.status}`);
const pattern = new RegExp(`^[a-z]{${wordLength}}$`);
const words = [
  ...new Set(
    (await response.text())
      .split(/\r?\n/)
      .map((word) => word.trim())
      .filter((word) => pattern.test(word)),
  ),
].sort();

const file = wordsFileSchema.parse({ source, license: "The Unlicense", words });
await writeFile("data/words.json", `${JSON.stringify(file)}\n`);
log.info("data:words wrote data/words.json", { words: words.length });
