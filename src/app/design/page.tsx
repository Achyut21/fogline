import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { app, design } from "@/copy";
import { contrast } from "@/lib/contrast";
import { duration, ease, spring, stagger } from "@/lib/motion";
import { parseTokens } from "@/lib/tokens";
import { lines, textPairs } from "@/styles/pairs";
import { colorGroups } from "@/styles/swatches";

export const metadata: Metadata = {
  title: design.title,
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

const tokens = parseTokens(readFileSync(path.join(process.cwd(), "src/styles/tokens.css"), "utf8"));

const px = (rem: string) => parseFloat(rem) * 16;

// Translucent tokens are shown over their own theme's background, not over this page's card.
const swatch = (set: Record<string, string>, name: string) =>
  `linear-gradient(${set[name]}, ${set[name]}), ${set.bg}`;

const layers = Object.entries(tokens.day)
  .filter(([name]) => name.startsWith("layer-"))
  .map(([name, value]) => ({ name: name.replace("layer-", ""), value: Number(value) }))
  .sort((a, b) => a.value - b.value);

const typeRoles = [
  { ...design.typeRoles.hero, className: "text-3xl font-extrabold tracking-tight tabular-nums" },
  { ...design.typeRoles.bigHero, className: "text-5xl font-extrabold tracking-tight tabular-nums" },
  { ...design.typeRoles.title, className: "text-2xl font-extrabold tracking-tight" },
  { ...design.typeRoles.stat, className: "text-xl font-extrabold tabular-nums" },
  { ...design.typeRoles.button, className: "text-lg font-bold" },
  { ...design.typeRoles.secondary, className: "text-base font-bold" },
  { ...design.typeRoles.row, className: "text-base font-bold" },
  { ...design.typeRoles.body, className: "text-base" },
  { ...design.typeRoles.label, className: "text-sm font-bold" },
  { ...design.typeRoles.meta, className: "text-sm text-ink-muted" },
  { ...design.typeRoles.caption, className: "text-xs font-semibold text-ink-muted" },
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
];

const elevations = ["shadow-sm", "shadow-md", "shadow-lg"];

const grounds = ["map-land", "map-water", "map-park", "map-road"] as const;

const hexagon = (cx: number, cy: number, r: number) =>
  [-90, -30, 30, 90, 150, 210]
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    })
    .join(" ");

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
      <h2 id={id} className="text-xl font-extrabold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CasedLines() {
  return lines.map((name, i) => {
    const y = 22 + i * 18;
    const d = `M-10 ${y} C 50 ${y - 12}, 110 ${y + 12}, 170 ${y}`;
    return (
      <g key={name} fill="none" strokeLinecap="round">
        <path d={d} stroke={`var(--line-${name}-casing)`} strokeWidth={9} />
        <path d={d} stroke={`var(--line-${name})`} strokeWidth={5} />
      </g>
    );
  });
}

export default function DesignPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pt-10 pb-18">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">{design.title}</h1>
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
                unoptimized
                className={`${className} size-18 shadow-md`}
              />
              <span aria-hidden="true" className="text-xs text-ink-muted">
                {label}
              </span>
            </li>
          ))}
          <li className="text-xl font-extrabold tracking-snug">{app.name}</li>
        </ul>
      </Section>

      <Section id="color" title={design.sections.color}>
        {colorGroups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-ink-muted">{design.colorGroups[group.id]}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {group.names.map((name) => (
                <li key={name} className="flex flex-col gap-2 rounded-md bg-surface p-3 shadow-sm">
                  <span
                    aria-hidden="true"
                    className="grid h-14 grid-cols-2 overflow-hidden rounded-sm border border-rule"
                  >
                    <span style={{ background: swatch(tokens.day, name) }} />
                    <span style={{ background: swatch(tokens.night, name) }} />
                  </span>
                  <span className="text-sm font-bold">{name}</span>
                  <span className="flex flex-col text-xs text-ink-muted tabular-nums">
                    <span className="wrap-anywhere">{design.swatchDay(tokens.day[name])}</span>
                    <span className="wrap-anywhere">{design.swatchNight(tokens.night[name])}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="map" title={design.sections.map}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {grounds.map((ground) => (
            <li key={ground} className="flex flex-col gap-2">
              <svg
                viewBox="0 0 160 96"
                aria-hidden="true"
                className="w-full overflow-hidden rounded-md"
              >
                <rect width="160" height="96" fill={`var(--${ground})`} />
                <CasedLines />
              </svg>
              <span className="text-sm font-bold">{design.grounds[ground]}</span>
            </li>
          ))}
          <li className="flex flex-col gap-2">
            <svg
              viewBox="0 0 160 96"
              aria-hidden="true"
              className="w-full overflow-hidden rounded-md"
            >
              <rect width="160" height="96" fill="var(--map-land)" />
              <polygon points={hexagon(34, 48, 30)} fill="var(--fog)" />
              <polygon points={hexagon(86, 48, 30)} fill="var(--fog-thin)" />
              <polygon
                points={hexagon(138, 48, 30)}
                fill="none"
                stroke="var(--fog-edge)"
                strokeWidth={3}
              />
              <CasedLines />
              <text
                x="80"
                y="88"
                textAnchor="middle"
                paintOrder="stroke"
                stroke="var(--halo)"
                strokeWidth={4}
                fill="var(--ink)"
                className="text-xs font-bold"
              >
                {design.stationSample}
              </text>
            </svg>
            <span className="text-sm font-bold">{design.fogStates}</span>
          </li>
        </ul>
      </Section>

      <Section id="contrast" title={design.sections.contrast}>
        <p className="text-sm text-ink-muted">{design.contrastNote}</p>
        <div className="overflow-x-auto rounded-md bg-surface shadow-sm">
          <table className="w-full text-left text-sm tabular-nums">
            <thead className="text-ink-muted">
              <tr>
                <th scope="col" className="p-3 font-bold">
                  {design.contrastColumns.pair}
                </th>
                <th scope="col" className="p-3 font-bold">
                  {design.contrastColumns.day}
                </th>
                <th scope="col" className="p-3 font-bold">
                  {design.contrastColumns.night}
                </th>
              </tr>
            </thead>
            <tbody>
              {textPairs.map(({ fg, bg }) => (
                <tr key={`${fg}-${bg}`} className="border-t border-rule">
                  <th scope="row" className="p-3 font-normal">
                    <span
                      className="inline-flex flex-col rounded-sm px-2 py-1 font-bold"
                      style={{ color: `var(--${fg})`, background: `var(--${bg})` }}
                    >
                      <span className="whitespace-nowrap">{fg}</span>
                      <span className="whitespace-nowrap">{design.pairOn(bg)}</span>
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
        <p className="text-sm text-ink-muted">{design.sampleNote}</p>
        <dl className="flex flex-col divide-y divide-rule rounded-md bg-surface shadow-sm">
          {typeRoles.map(({ label, sample, className }) => (
            <div key={label} className="flex flex-col gap-1 p-3">
              <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
              <dd className={className}>{sample}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-col gap-3">
          {typeSteps.map(({ name, className }) => (
            <li key={name} className="flex flex-col">
              <span className="text-xs text-ink-muted tabular-nums">
                {design.typeSize(name, px(tokens.day[`type-${name}`]))}
              </span>
              <span className={`${className} tabular-nums`}>{design.typeSample}</span>
            </li>
          ))}
        </ul>
        <p
          className="flex flex-wrap gap-x-6 text-3xl font-extrabold tabular-nums"
          data-testid="tabular-sample"
        >
          <span data-digits="ones">{design.digits.ones}</span>
          <span data-digits="zeros">{design.digits.zeros}</span>
          <span>{design.numberSample}</span>
        </p>
      </Section>

      <Section id="spacing" title={design.sections.spacing}>
        <ul className="flex flex-col gap-2">
          {spacingSteps.map(({ step, className }) => (
            <li key={step} className="flex items-center gap-4">
              <span className="w-18 shrink-0 text-xs text-ink-muted tabular-nums">
                {design.spacingStep(step, Number(step) * 4)}
              </span>
              <span aria-hidden="true" className={`${className} h-4 bg-accent`} />
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
              <span className="text-xs text-ink-muted tabular-nums">
                {design.radiusValue(name, px(tokens.day[`radius-${name}`]))}
              </span>
            </li>
          ))}
          <li className="flex flex-col items-center gap-2">
            <span
              aria-hidden="true"
              className="size-18 rounded-full border border-rule bg-surface"
            />
            <span className="text-xs text-ink-muted">{design.radiusFull}</span>
          </li>
        </ul>
      </Section>

      <Section id="elevation" title={design.sections.elevation}>
        <ul className="flex flex-wrap gap-6">
          {elevations.map((className) => (
            <li key={className} className="flex flex-col items-center gap-2">
              <span aria-hidden="true" className={`${className} size-18 rounded-lg bg-surface`} />
              <span className="text-xs text-ink-muted">{className}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="motion" title={design.sections.motion}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(duration).map(([name, seconds]) => (
            <li key={name} className="flex flex-col rounded-md bg-surface p-3 shadow-sm">
              <span className="text-sm font-bold">{design.duration(name)}</span>
              <span className="text-xl font-extrabold tabular-nums">
                {design.milliseconds(Math.round(seconds * 1000))}
              </span>
            </li>
          ))}
        </ul>
        <dl className="flex max-w-lg flex-col divide-y divide-rule rounded-md bg-surface text-sm shadow-sm">
          {Object.entries(ease).map(([name, curve]) => (
            <div key={name} className="flex flex-wrap justify-between gap-x-4 p-3">
              <dt className="font-bold">{design.ease(name)}</dt>
              <dd className="text-ink-muted tabular-nums">{design.curve(curve)}</dd>
            </div>
          ))}
          {Object.entries(spring).map(([name, { stiffness, damping }]) => (
            <div key={name} className="flex flex-wrap justify-between gap-x-4 p-3">
              <dt className="font-bold">{design.spring(name)}</dt>
              <dd className="text-ink-muted tabular-nums">
                {design.springValues(stiffness, damping)}
              </dd>
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-x-4 p-3">
            <dt className="font-bold">{design.stagger}</dt>
            <dd className="text-ink-muted tabular-nums">
              {design.staggerValues(Math.round(stagger.list * 1000), stagger.maxItems)}
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="layers" title={design.sections.layers}>
        <ol className="flex max-w-lg flex-col divide-y divide-rule rounded-md bg-surface text-sm shadow-sm">
          {layers.map(({ name, value }) => (
            <li key={name} className="flex justify-between p-3">
              <span className="font-bold">{name}</span>
              <span className="text-ink-muted tabular-nums">{value}</span>
            </li>
          ))}
        </ol>
      </Section>
    </main>
  );
}
