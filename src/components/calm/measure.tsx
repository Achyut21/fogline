"use client";

import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isLine, LineBadge } from "@/components/display/line-badge";
import { Button } from "@/components/ui/button";
import { calm } from "@/copy";
import { frameLevel, segmentLevels } from "@/lib/noise";
import { recordNoise } from "@/server/actions/noise";

type Next = { route: string; to: string; toName: string };
type Status = "idle" | "measuring" | "sending" | "sent";
type ErrorKey = keyof typeof calm.errors;

const frameMs = 250;
// At least two seconds of sound make a reading. Browsers may slow timers down, so this counts
// time, not frames.
const minMs = 2_000;
const selectClass =
  "h-12 w-full rounded-md border border-field-border bg-field px-4 text-base font-semibold text-ink";

/**
 * Measuring one stretch of a ride (F13.1). The microphone is read only between Start and Stop,
 * each 250 ms frame becomes one level on the phone, and only the stretch's average and peak are
 * sent. The primer comes before the browser's permission prompt (F1.4).
 */
export function Measure({
  stations,
  next,
}: {
  stations: { id: string; name: string }[];
  next: Record<string, Next[]>;
}) {
  const [primed, setPrimed] = useState(false);
  const [from, setFrom] = useState("");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const levels = useRef<number[]>([]);
  const startedAt = useRef(0);
  const stopAudio = useRef<(() => void) | null>(null);

  useEffect(() => () => stopAudio.current?.(), []);

  const options = from ? (next[from] ?? []) : [];
  const chosen = options.find((o) => `${o.route}:${o.to}` === segment);

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("unavailable");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      if (!(e instanceof DOMException)) throw e;
      setError(e.name === "NotAllowedError" ? "denied" : "unavailable");
      return;
    }
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    context.createMediaStreamSource(stream).connect(analyser);
    const frame = new Float32Array(analyser.fftSize);
    levels.current = [];
    startedAt.current = performance.now();
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(frame);
      const db = frameLevel(frame);
      levels.current.push(db);
      setLevel(db);
    }, frameMs);
    stopAudio.current = () => {
      clearInterval(timer);
      for (const track of stream.getTracks()) track.stop();
      void context.close();
      stopAudio.current = null;
    };
    setStatus("measuring");
  }

  async function stop() {
    stopAudio.current?.();
    setLevel(null);
    const long = performance.now() - startedAt.current >= minMs;
    const summary = long ? segmentLevels(levels.current) : null;
    levels.current = [];
    if (!summary || !chosen) {
      setStatus("idle");
      setError("short");
      return;
    }
    setStatus("sending");
    try {
      const result = await recordNoise({
        route: chosen.route,
        from,
        to: chosen.to,
        dbAvg: summary.avg,
        dbPeak: summary.peak,
      });
      if (result.kind === "recorded") {
        setStatus("sent");
        setFrom(chosen.to);
        setSegment("");
        return;
      }
      setError(result.reason);
    } catch (e) {
      if (!(e instanceof Error)) throw e;
      setError("failed");
    }
    setStatus("idle");
  }

  if (!primed) {
    return (
      <section aria-labelledby="primer" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 id="primer" className="flex items-center gap-2 text-lg font-extrabold">
          <Mic aria-hidden="true" className="size-5 text-accent" />
          {calm.primer.title}
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          {calm.primer.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <Button onClick={() => setPrimed(true)}>{calm.primer.accept}</Button>
      </section>
    );
  }

  const measuring = status === "measuring";
  return (
    <section className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">{calm.from}</span>
        <select
          value={from}
          disabled={measuring}
          onChange={(e) => {
            setFrom(e.target.value);
            setSegment("");
            setStatus("idle");
          }}
          className={selectClass}
        >
          <option value="">{calm.pick}</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {options.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1 text-sm font-bold">{calm.to}</legend>
          {options.map((o) => {
            const key = `${o.route}:${o.to}`;
            return (
              <label
                key={key}
                className="flex min-h-11 items-center gap-3 rounded-md bg-surface-sunken px-3 has-checked:ring-2 has-checked:ring-accent"
              >
                <input
                  type="radio"
                  name="segment"
                  value={key}
                  checked={segment === key}
                  disabled={measuring}
                  onChange={() => setSegment(key)}
                  className="size-5 accent-(--accent)"
                />
                {isLine(o.route) && <LineBadge line={o.route} />}
                <span className="font-semibold">{o.toName}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      {measuring ? (
        <>
          <p role="status" className="flex items-baseline gap-2">
            <span className="text-sm font-bold">{calm.measuring}</span>
            {level !== null && (
              <span className="text-2xl font-extrabold tabular-nums">{calm.level(level)}</span>
            )}
          </p>
          <p className="text-xs text-ink-muted">{calm.levelNote}</p>
          <Button size="lg" variant="danger" onClick={stop}>
            {calm.stop}
          </Button>
        </>
      ) : (
        <>
          <Button size="lg" disabled={!chosen || status === "sending"} onClick={start}>
            {calm.start}
          </Button>
          <p className="text-xs text-ink-muted">{calm.startHint}</p>
        </>
      )}
      {status === "sent" && (
        <p role="status" className="text-sm font-semibold">
          {calm.sent}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {calm.errors[error]}
        </p>
      )}
    </section>
  );
}
