import type { Loudness } from "@/lib/noise";

// Calm mode (F13): measuring how loud rides are, and the sensory preview.

export const calm = {
  pageTitle: "Calm mode",
  title: "How loud is the T?",
  intro:
    "Measure the ride you're on. Fogline shares how loud each stretch is, so riders can pick a calmer one.",
  primer: {
    title: "Before you turn on the microphone",
    points: [
      "Your phone listens only while you measure one stretch, from doors closing to the next stop.",
      "Sound never leaves your phone and is never saved. Fogline sends two numbers: the average and the peak level.",
      "You can stop at any time.",
    ],
    accept: "Turn on the microphone",
  },
  line: "Line",
  from: "Riding from",
  to: "To",
  pick: "Pick a station",
  start: "Start measuring",
  startHint: "Tap when the doors close.",
  stop: "Stop at the next station",
  measuring: "Measuring",
  level: (db: number) => `${Math.round(db)} dB`,
  levelNote: "Relative level from your microphone, not calibrated.",
  sent: "Sent: two numbers for this stretch. Thanks.",
  errors: {
    denied: "The microphone is off for Fogline. Turn it on in your browser settings to measure.",
    unavailable: "This browser can't use the microphone.",
    "too-soon": "One stretch a minute. Try again at the next stop.",
    segment: "Those stations aren't next to each other on that line.",
    "no-profile": "Make a profile first.",
    short: "That was too short to measure. Ride a full stretch.",
    failed: "Couldn't send the numbers. Check your connection and try again.",
  },
  measured: {
    title: "Measured by riders",
    note: "Relative loudness over the last 30 days, from riders' phones.",
    empty: "No stretches measured yet.",
    segment: (from: string, to: string) => `${from} to ${to}`,
    readings: (n: number) => (n === 1 ? "1 reading" : `${n} readings`),
  },
  loudness: { quieter: "Quieter", typical: "Typical", louder: "Louder" } satisfies Record<
    Loudness,
    string
  >,
  sensory: {
    title: "Sensory preview",
    sound: (loudness: Loudness, readings: number) =>
      `${{ quieter: "Quieter", typical: "Typical", louder: "Louder" }[loudness]} than most stretches, measured by riders (${readings === 1 ? "1 reading" : `${readings} readings`}).`,
    noSound: "No rides measured here yet.",
    quietest: (hour: string) => `Quietest rides measured around ${hour}.`,
    crowds: "No entry counts for this station yet.",
    waiting: "No data yet on the quietest place to wait.",
    measure: "Measure a ride",
  },
} as const;
