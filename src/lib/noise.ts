// Calm mode's sound levels (F13.1), computed on the device from microphone samples. Levels are
// dBFS (0 is the loudest the microphone reports), uncalibrated, so they are only compared with
// each other on a relative scale (F13.3). No audio is kept: each frame becomes one number.

/** The floor for silence or a muted microphone, so log10(0) never appears. */
export const floorDb = -100;

/** One frame's level in dBFS from its time-domain samples (-1 to 1). */
export function frameLevel(samples: ArrayLike<number>): number {
  if (samples.length === 0) return floorDb;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / samples.length);
  return rms > 0 ? Math.max(floorDb, 20 * Math.log10(rms)) : floorDb;
}

/**
 * A segment's average and peak from its frame levels. The average is taken over sound energy,
 * not over decibels, so a loud stretch counts for what it is.
 */
export function segmentLevels(levels: readonly number[]): { avg: number; peak: number } | null {
  if (levels.length === 0) return null;
  const energy = levels.reduce((sum, db) => sum + 10 ** (db / 10), 0) / levels.length;
  const round = (db: number) => Math.round(db * 10) / 10;
  return { avg: round(10 * Math.log10(energy)), peak: round(Math.max(...levels)) };
}

export type Loudness = "quieter" | "typical" | "louder";

/**
 * Where a level sits among all measured segments: the bottom third is quieter, the top third
 * louder (F13.3's relative scale).
 */
export function loudnessOf(db: number, all: readonly number[]): Loudness {
  if (all.length < 3) return "typical";
  const sorted = [...all].sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length / 3)];
  const high = sorted[Math.floor((sorted.length * 2) / 3)];
  return db < low ? "quieter" : db > high ? "louder" : "typical";
}
