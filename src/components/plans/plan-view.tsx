"use client";

import { ArrowLeft, Link2, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { Countdown } from "@/components/display/countdown";
import { Button } from "@/components/ui/button";
import { plans } from "@/copy";
import { clock } from "@/copy/plans";
import { checkIn, endPlan } from "@/server/actions/live";
import { joinPlan, type planByInvite } from "@/server/actions/plans";
import { LeaveByLine } from "./option-card";

const p = plans.plan;
const r = p.checkInResult;

export type PlanData = NonNullable<Awaited<ReturnType<typeof planByInvite>>>;

const minute = 60_000;
// Check-in opens 30 minutes before the start (DATA 3.9); live mode opens with it and closes when
// the plan ends, or 4 hours after the start, when F6.4 ends a plan nobody ended.
const liveFromMs = 30 * minute;
const liveUntilMs = 4 * 60 * minute;
// Arrival order reaches everyone within 10 s (F6.3).
const refreshMs = 8_000;

const noop = () => () => {};
const tick = (onChange: () => void) => {
  const id = setInterval(onChange, 15_000);
  return () => clearInterval(id);
};
const now = () => Math.floor(Date.now() / 15_000) * 15_000;

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    }),
  );
}

/**
 * A plan (F4.8, F4.9, F5.2, F6.1–F6.4): the spot and who's going with their leave-by times for
 * members; Join for invitees; once it is close to the start, live mode with a countdown, check-in
 * and the arrival order; End for the organizer.
 */
export function PlanView({
  plan,
  token,
  signedIn,
}: {
  plan: PlanData;
  token: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checkInLine, setCheckInLine] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const clock = useSyncExternalStore(signedIn ? tick : noop, now, () => null);

  const startsAt = new Date(plan.startsAt);
  const ended = plan.status === "ended";
  const live =
    !ended &&
    plan.viewer.member &&
    clock !== null &&
    clock >= startsAt.getTime() - liveFromMs &&
    clock < startsAt.getTime() + liveUntilMs;

  const me = plan.people.find((x) => x.you);
  const myLeaveBy = me?.leaveBy?.kind === "train" ? me.leaveBy.leaveBy : null;
  const hidden = plan.adultsOnly && plan.spot === null;
  const started = clock !== null && clock >= startsAt.getTime();
  const countdownTo = started && myLeaveBy ? myLeaveBy : startsAt;

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, refreshMs);
    return () => clearInterval(id);
  }, [live, router]);

  function join() {
    start(async () => {
      const result = await joinPlan(token);
      if (result.kind === "joined") router.refresh();
      else toast(p.joinErrors[result.kind]);
    });
  }

  async function invite() {
    const url = `${window.location.origin}/p/${plan.id}?t=${token}`;
    if (navigator.share) {
      await navigator
        .share({ title: plan.title, text: p.share(plan.title), url })
        .catch((e: unknown) => {
          // Closing the share sheet rejects with AbortError; that isn't a failure.
          if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
        });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast(p.copied);
  }

  async function checkInHere() {
    setChecking(true);
    setCheckInLine(null);
    try {
      const at = await position();
      const result = await checkIn({
        planId: plan.id,
        lat: at.coords.latitude,
        lon: at.coords.longitude,
        accuracyM: at.coords.accuracy,
      });
      if (result.valid) {
        setCheckInLine(p.checkedIn);
        router.refresh();
      } else if (result.reason === "too-far") setCheckInLine(r["too-far"](result.distanceM));
      else if (result.reason === "low-accuracy")
        setCheckInLine(r["low-accuracy"](result.accuracyM));
      else if (result.reason === "too-early") setCheckInLine(r["too-early"](result.opensAt));
      else if (result.reason === "plan-ended") setCheckInLine(r["plan-ended"]);
      else setCheckInLine(p.joinErrors[result.reason]);
    } catch (e) {
      if (e instanceof GeolocationPositionError) {
        setCheckInLine(e.code === e.PERMISSION_DENIED ? r.denied : r.unavailable);
      } else if (e instanceof Error) setCheckInLine(r.failed);
      else throw e;
    } finally {
      setChecking(false);
    }
  }

  function end() {
    start(async () => {
      const result = await endPlan({ planId: plan.id });
      if (result.kind === "ended") router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center gap-2 px-2 pt-safe">
        <Button variant="ghost" asChild>
          <Link href="/plans">
            <ArrowLeft aria-hidden="true" />
            {p.back}
          </Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-6 px-4 pb-safe">
        <div className="flex flex-col gap-1">
          {live && (
            <p className="self-start rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink">
              {p.live}
            </p>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight">{plan.title}</h1>
          <p className="text-ink-muted">{p.when(startsAt)}</p>
        </div>

        {hidden ? (
          <section role="status" className="flex flex-col gap-2 rounded-lg bg-surface p-4">
            <h2 className="text-lg font-extrabold">{p.adultsOnly}</h2>
            <p className="text-sm text-ink-muted">{p.adultsOnlyBody}</p>
          </section>
        ) : plan.stops.length > 1 ? (
          <section aria-labelledby="stops" className="flex flex-col gap-2 rounded-lg bg-surface p-4">
            <h2 id="stops" className="text-sm font-bold text-ink-muted">
              {p.stops(plan.stops.length)}
            </h2>
            <ol className="flex flex-col gap-3">
              {plan.stops.map((stop, i) => (
                <li key={`${stop.id}-${i}`} className="flex items-baseline gap-3">
                  <span className="w-20 shrink-0 text-sm font-bold tabular-nums">
                    {clock(new Date(stop.scheduledAt))}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-extrabold">{stop.name}</span>
                    <span className="text-sm text-ink-muted">{stop.station}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          plan.spot && (
            <section
              aria-labelledby="spot"
              className="flex flex-col gap-1 rounded-lg bg-surface p-4"
            >
              <h2 id="spot" className="text-sm font-bold text-ink-muted">
                {p.spot}
              </h2>
              <p className="flex items-center gap-2 text-lg font-extrabold">
                <MapPin aria-hidden="true" className="size-5 text-accent" />
                {plan.spot.name}
              </p>
              {plan.station && <p className="text-sm text-ink-muted">{plan.station.name}</p>}
            </section>
          )
        )}

        {ended && (
          <p role="status" className="rounded-md bg-surface-sunken px-4 py-3 font-semibold">
            {p.ended}
          </p>
        )}

        {live && (
          <section aria-labelledby="live" className="flex flex-col gap-4 rounded-lg bg-surface p-4">
            <h2 id="live" className="sr-only">
              {p.live}
            </h2>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">
                {started && myLeaveBy ? p.leaveIn : p.startsIn}
              </span>
              <Countdown to={countdownTo} className="text-4xl font-extrabold tracking-tight" />
            </div>
            <Button size="lg" disabled={checking} onClick={checkInHere}>
              {checking ? p.checkingIn : p.checkIn}
            </Button>
            {checkInLine && (
              <p role="status" className="text-sm font-semibold">
                {checkInLine}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <h3 id="arrivals" className="text-sm font-bold text-ink-muted">
                {p.arrivals}
              </h3>
              {plan.arrivals.length === 0 ? (
                <p className="text-sm text-ink-muted">{p.noArrivals}</p>
              ) : (
                <ol
                  aria-labelledby="arrivals"
                  className="flex list-decimal flex-col gap-1 pl-5 font-semibold"
                >
                  {plan.arrivals.map((a) => (
                    <li key={a.id}>{a.name}</li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        )}

        <section aria-labelledby="people" className="flex flex-col gap-3">
          <h2 id="people" className="text-sm font-bold text-ink-muted">
            {p.people}
          </h2>
          <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface shadow-sm">
            {plan.people.map((person) => (
              <li key={person.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">{person.name}</span>
                  {person.placeholder && (
                    <span className="text-xs text-ink-muted">{p.placeholder}</span>
                  )}
                </div>
                {person.leaveBy && <LeaveByLine name={person.name} leaveBy={person.leaveBy} />}
              </li>
            ))}
          </ul>
          {!plan.viewer.member && <p className="text-sm text-ink-muted">{p.leaveByHidden}</p>}
        </section>

        <div className="mt-auto flex flex-col gap-3 pb-4">
          {!plan.viewer.member &&
            !ended &&
            !hidden &&
            (signedIn ? (
              <Button size="lg" disabled={pending} onClick={join}>
                {pending ? p.joining : p.join}
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/welcome">{p.joinNeedsProfile}</Link>
              </Button>
            ))}
          {plan.viewer.member && !ended && (
            <Button variant="secondary" onClick={invite}>
              <Link2 aria-hidden="true" />
              {p.invite}
            </Button>
          )}
          {plan.viewer.organizer && !ended && live && (
            <Button variant="danger" disabled={pending} onClick={end}>
              {pending ? p.ending : p.end}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
