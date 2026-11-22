import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { app, design } from "@/copy";
import { contrast } from "@/lib/contrast";
import { duration, ease, spring, stagger } from "@/lib/motion";
import { parseTokens } from "@/lib/tokens";
import { textPairs } from "@/styles/pairs";

export const metadata: Metadata = {
  title: design.title,
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

const tokens = parseTokens(readFileSync(path.join(process.cwd(), "src/styles/tokens.css"), "utf8"));

const layers = Object.entries(tokens.day)
  .filter(([name]) => name.startsWith("layer-"))
  .map(([name, value]) => [name.replace("layer-", ""), value] as const);

const colorGroups = [
  {
    label: design.colorGroups.surfaces,
    names: ["bg", "surface", "surface-raised", "surface-sunken", "rule"],
  },
  { label: design.colorGroups.ink, names: ["ink", "ink-muted", "ink-subtle"] },
  { label: design.colorGroups.accent, names: ["accent", "accent-ink", "accent-soft"] },
  { label: design.colorGroups.states, names: ["success", "warning", "danger", "danger-ink"] },
  {
    label: design.colorGroups.map,
    names: ["fog", "map-land", "map-water", "map-park", "map-road"],
  },
  {
    label: design.colorGroups.lines,
    names: ["line-red", "line-orange", "line-blue", "line-green"],
  },
];

const typeSteps = [
  { name: "xs", className: "text-xs" },
  { name: "sm", className: "text-sm" },
  { name: "base", className: "text-base" },
  { name: "lg", className: "text-lg" },
  { name: "xl", className: "text-xl" },
  { name: "2xl", className: "text-2xl" },
  { name: "3xl", className: "text-3xl" },
  { name: "4xl", className: "text-4xl" },
  { name: "5xl", className: "text-5xl" },
];

const spacingSteps = [
  { step: "1", className: "w-1" },
  { step: "2", className: "w-2" },
  { step: "3", className: "w-3" },
  { step: "4", className: "w-4" },
  { step: "5", className: "w-5" },
  { step: "6", className: "w-6" },
  { step: "8", className: "w-8" },
  { step: "10", className: "w-10" },
  { step: "14", className: "w-14" },
  { step: "18", className: "w-18" },
];

const radii = [
  { name: "small", className: "rounded-sm" },
  { name: "tile", className: "rounded-md" },
  { name: "card", className: "rounded-lg" },
  { name: "sheet", className: "rounded-xl" },
  { name: "full", className: "rounded-full" },
];

const elevations = [
  { name: "1", className: "shadow-sm" },
  { name: "2", className: "shadow-md" },
  { name: "3", className: "shadow-lg" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pt-10 pb-18">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">{design.title}</h1>
        <p className="max-w-prose text-ink-muted">{design.intro}</p>
        <div className="max-w-sm">
          <ThemeToggle />
        </div>
      </header>

      <Section id="brand" title={design.sections.brand}>
        <ul className="flex flex-wrap items-end gap-6">
          {[
            { label: design.iconMasks.square, className: "rounded-lg" },
            { label: design.iconMasks.circle, className: "rounded-full" },
          ].map(({ label, className }) => (
            <li key={label} className="flex flex-col items-center gap-2">
              <Image
                src="/icons/icon-192.png"
                alt={design.iconAlt(label)}
                width={96}
                height={96}
                className={`${className} size-18 shadow-md`}
              />
              <span aria-hidden="true" className="text-xs text-ink-muted">
                {label}
              </span>
            </li>
          ))}
          <li className="text-4xl font-extrabold tracking-tight">{app.name}</li>
        </ul>
      </Section>

      <Section id="color" title={design.sections.color}>
        {colorGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink-muted">{group.label}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {group.names.map((name) => (
                <li key={name} className="flex flex-col gap-2 rounded-md bg-surface p-3 shadow-sm">
                  <span
                    aria-hidden="true"
                    className="h-14 rounded-sm border border-rule"
                    style={{ background: `var(--${name})` }}
                  />
                  <span className="text-sm font-semibold">{name}</span>
                  <span className="text-xs text-ink-muted tabular-nums">
                    {design.swatch(tokens.day[name], tokens.night[name])}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="contrast" title={design.sections.contrast}>
        <p className="text-sm text-ink-muted">{design.contrastNote}</p>
        <div className="overflow-x-auto rounded-md bg-surface shadow-sm">
          <table className="w-full text-left text-sm tabular-nums">
            <thead className="text-ink-muted">
              <tr>
                <th scope="col" className="p-3 font-semibold">
                  {design.contrastColumns.pair}
                </th>
                <th scope="col" className="p-3 font-semibold">
                  {design.contrastColumns.day}
                </th>
                <th scope="col" className="p-3 font-semibold">
                  {design.contrastColumns.night}
                </th>
              </tr>
            </thead>
            <tbody>
              {textPairs.map(({ fg, bg }) => (
                <tr key={`${fg}-${bg}`} className="border-t border-rule">
                  <th scope="row" className="p-3 font-normal">
                    <span
                      className="inline-block rounded-sm px-2 py-1 font-semibold"
                      style={{ color: `var(--${fg})`, background: `var(--${bg})` }}
                    >
                      {design.pair(fg, bg)}
                    </span>
                  </th>
                  {[tokens.day, tokens.night].map((set, i) => {
                    const ratio = contrast(set[fg], set[bg]);
                    return (
                      <td key={i} className="p-3">
                        {design.ratio(ratio)}{" "}
                        <span className={ratio >= 4.5 ? "text-ink-muted" : "font-bold text-danger"}>
                          {ratio >= 4.5 ? design.passes : design.fails}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="type" title={design.sections.type}>
        <ul className="flex flex-col gap-3">
          {typeSteps.map(({ name, className }) => (
            <li key={name} className="flex items-baseline gap-4">
              <span className="w-10 shrink-0 text-xs text-ink-muted">{name}</span>
              <span className={`${className} font-bold tabular-nums`}>{design.typeSample}</span>
            </li>
          ))}
        </ul>
        <p className="flex gap-6 text-3xl font-extrabold tabular-nums" data-testid="tabular-sample">
          <span data-digits="ones">1111</span>
          <span data-digits="zeros">0000</span>
          <span>{design.numberSample}</span>
        </p>
      </Section>

      <Section id="spacing" title={design.sections.spacing}>
        <ul className="flex flex-col gap-2">
          {spacingSteps.map(({ step, className }) => (
            <li key={step} className="flex items-center gap-4">
              <span className="w-10 shrink-0 text-xs text-ink-muted tabular-nums">{step}</span>
              <span aria-hidden="true" className={`${className} h-4 rounded-sm bg-accent`} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="radius" title={design.sections.radius}>
        <ul className="flex flex-wrap gap-4">
          {radii.map(({ name, className }) => (
            <li key={name} className="flex flex-col items-center gap-2">
              <span
                aria-hidden="true"
                className={`${className} size-18 border border-rule bg-surface`}
              />
              <span className="text-xs text-ink-muted">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="elevation" title={design.sections.elevation}>
        <ul className="flex flex-wrap gap-6">
          {elevations.map(({ name, className }) => (
            <li key={name} className="flex flex-col items-center gap-2">
              <span aria-hidden="true" className={`${className} size-18 rounded-lg bg-surface`} />
              <span className="text-xs text-ink-muted">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="motion" title={design.sections.motion}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(duration).map(([name, seconds]) => (
            <li key={name} className="flex flex-col rounded-md bg-surface p-3 shadow-sm">
              <span className="text-sm font-semibold">{name}</span>
              <span className="text-2xl font-extrabold tabular-nums">
                {design.milliseconds(Math.round(seconds * 1000))}
              </span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 rounded-md bg-surface p-4 text-sm shadow-sm">
          {Object.entries(ease).map(([name, curve]) => (
            <div key={name} className="flex flex-wrap justify-between gap-x-4">
              <dt className="font-semibold">{design.ease(name)}</dt>
              <dd className="text-ink-muted tabular-nums">{design.curve(curve)}</dd>
            </div>
          ))}
          {Object.entries(spring).map(([name, { stiffness, damping }]) => (
            <div key={name} className="flex flex-wrap justify-between gap-x-4">
              <dt className="font-semibold">{design.spring(name)}</dt>
              <dd className="text-ink-muted tabular-nums">
                {design.springValues(stiffness, damping)}
              </dd>
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="font-semibold">{design.stagger}</dt>
            <dd className="text-ink-muted tabular-nums">
              {design.staggerValues(Math.round(stagger.list * 1000), stagger.maxItems)}
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="layers" title={design.sections.layers}>
        <ol className="flex flex-col gap-2 text-sm">
          {layers.map(([name, value]) => (
            <li key={name} className="flex justify-between rounded-md bg-surface p-3 shadow-sm">
              <span className="font-semibold">{name}</span>
              <span className="text-ink-muted tabular-nums">{value}</span>
            </li>
          ))}
        </ol>
      </Section>
    </main>
  );
}
