"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { LineBadge, type Line } from "@/components/display/line-badge";
import { Button } from "@/components/ui/button";
import { ChoiceList } from "@/components/ui/choice-list";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { app, onboarding } from "@/copy";
import { createProfile } from "@/server/actions/profile";

export type SchoolChoice = {
  name: string;
  stations: { id: string; name: string; lines: Line[] }[];
};

type Age = "under21" | "21plus";

const o = onboarding;

// F1.1: four screens (name, school, home station, age). The answers ride along in hidden inputs,
// so the last step sends them all to createProfile at once.
export function Onboarding({
  schools,
  allStations,
}: {
  schools: readonly SchoolChoice[];
  allStations: readonly { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createProfile, { error: null });
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [station, setStation] = useState("");
  const [age, setAge] = useState<Age | "">("");
  const heading = useRef<HTMLHeadingElement>(null);
  const chosen = schools.find((s) => s.name === school);
  const ready = [name.trim() !== "", school !== "", station !== "", age !== ""][step - 1];

  useEffect(() => {
    if (step > 1) heading.current?.focus();
  }, [step]);

  function pickSchool(next: string) {
    setSchool(next);
    setStation(schools.find((s) => s.name === next)?.stations[0]?.id ?? "");
  }

  function enterName(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (ready) setStep(2);
  }

  const title = "text-2xl font-extrabold tracking-tight outline-none";

  return (
    <form
      action={action}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-safe pb-safe"
    >
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="school" value={school} />
      <input type="hidden" name="homeStationId" value={station} />
      <input type="hidden" name="ageBand" value={age} />

      <header className="flex h-14 items-center gap-2">
        {step > 1 && (
          <IconButton label={o.back} icon={ArrowLeft} onClick={() => setStep(step - 1)} />
        )}
        <p className="text-xs font-bold text-ink-muted">{o.step(step)}</p>
      </header>

      <div className="flex flex-1 flex-col gap-4">
        {step === 1 && (
          <>
            <p className="text-xl font-extrabold tracking-snug">{app.name}</p>
            <h1 className={title}>{o.welcome.title}</h1>
            <p className="text-ink-muted">{o.welcome.body}</p>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold">{o.welcome.nameLabel}</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={enterName}
                autoComplete="given-name"
                maxLength={40}
                aria-describedby="name-help"
              />
              <span id="name-help" className="text-sm text-ink-muted">
                {o.welcome.nameHelp}
              </span>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h1 ref={heading} tabIndex={-1} className={title}>
              {o.school.title}
            </h1>
            <ChoiceList
              label={o.school.label}
              choices={schools.map((s) => ({ value: s.name, label: s.name }))}
              value={school}
              onValueChange={pickSchool}
            />
          </>
        )}

        {step === 3 && chosen && (
          <>
            <h1 ref={heading} tabIndex={-1} className={title}>
              {o.station.title}
            </h1>
            <p className="text-ink-muted">{o.station.body}</p>
            {chosen.stations.length > 0 && (
              <>
                <p className="text-sm font-bold text-ink-muted">{o.station.near(chosen.name)}</p>
                <ChoiceList
                  label={o.station.title}
                  choices={chosen.stations.map((s, i) => ({
                    value: s.id,
                    label: (
                      <>
                        {s.name}
                        {s.lines.map((line) => (
                          <LineBadge key={line} line={line} />
                        ))}
                      </>
                    ),
                    detail:
                      i === 0 ? (
                        <span className="shrink-0 rounded-full bg-surface-sunken px-3 py-1 text-xs font-bold">
                          {o.station.suggested}
                        </span>
                      ) : undefined,
                  }))}
                  value={chosen.stations.some((s) => s.id === station) ? station : ""}
                  onValueChange={setStation}
                />
              </>
            )}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold">{o.station.other}</span>
              <select
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="h-12 w-full rounded-md border border-field-border bg-field px-4 text-base font-semibold text-ink"
              >
                <option value="">{o.station.pick}</option>
                {allStations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h1 ref={heading} tabIndex={-1} className={title}>
              {o.age.title}
            </h1>
            <p className="text-ink-muted">{o.age.body}</p>
            <ChoiceList<Age>
              label={o.age.label}
              choices={[
                { value: "under21", label: o.age.under21 },
                { value: "21plus", label: o.age.over21 },
              ]}
              value={age}
              onValueChange={setAge}
            />
            <p className="text-sm text-ink-muted">{o.age.help}</p>
          </>
        )}
      </div>

      <footer className="sticky bottom-0 -mx-4 flex flex-col gap-2 bg-bg px-4 pt-3 pb-4">
        {state.error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {state.error}
          </p>
        )}
        {step < 4 ? (
          <Button type="button" size="lg" disabled={!ready} onClick={() => setStep(step + 1)}>
            {o.next}
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={!ready || pending}>
            {o.age.submit}
          </Button>
        )}
        {step === 1 && (
          <Button asChild variant="ghost">
            <Link href="/restore">{o.welcome.restore}</Link>
          </Button>
        )}
      </footer>
    </form>
  );
}
