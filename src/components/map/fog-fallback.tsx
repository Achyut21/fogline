import { cellToBoundary } from "h3-js";
import { fog, legal } from "@/copy";
import type { CellState } from "@/lib/geo/cells";
import { maskAspect, maskUv } from "@/three/fog-field";

type Line = {
  route: string;
  color: "red" | "orange" | "blue" | "green";
  coordinates: [number, number][];
};
type Station = { name: string; lon: number; lat: number };

const width = 1000;
const height = Math.round(width / maskAspect);

function point(lon: number, lat: number) {
  const [u, v] = maskUv(lon, lat);
  return `${(u * width).toFixed(1)} ${(v * height).toFixed(1)}`;
}

function cellPath(cell: string) {
  const ring = cellToBoundary(cell);
  return `M${ring.map(([lat, lon]) => point(lon, lat)).join("L")}Z`;
}

// The map without WebGL (F2.6, D-050 flag 1): MapLibre can't draw, so the lines, stations and fog
// cells are drawn as SVG. Seen cells keep thin fog, visited cells are clear, lines sit on top.
export function FogFallback({
  states,
  lines,
  stations,
}: {
  states: ReadonlyMap<string, CellState>;
  lines: readonly Line[];
  stations: readonly Station[];
}) {
  const cells = [...states.keys()];
  const seen = cells.filter((cell) => states.get(cell) === "seen");
  const outline = `M0 0H${width}V${height}H0Z`;
  return (
    <div className="relative h-full w-full">
      <svg
        role="img"
        aria-label={fog.mapLabel(cells.length)}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full bg-(--map-land)"
        data-renderer="svg"
      >
        <path
          d={outline + cells.map(cellPath).join("")}
          fill="var(--fog)"
          fillRule="evenodd"
          opacity={0.92}
        />
        <path d={seen.map(cellPath).join("")} fill="var(--fog)" opacity={0.45} />
        {lines.map((line, i) => {
          const d = `M${line.coordinates.map(([lon, lat]) => point(lon, lat)).join("L")}`;
          return (
            <g key={`${line.route}-${i}`} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path
                d={d}
                stroke={`var(--line-${line.color}-casing)`}
                strokeWidth={7}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={d}
                stroke={`var(--line-${line.color})`}
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
        {stations.map((s) => {
          const [u, v] = maskUv(s.lon, s.lat);
          return (
            <circle
              key={s.name}
              cx={u * width}
              cy={v * height}
              r={3.5}
              fill="var(--surface)"
              stroke="var(--ink)"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
      <p className="absolute right-2 bottom-2 rounded-sm bg-surface px-2 py-1 text-xs text-ink-muted">
        {legal.mbta}
      </p>
    </div>
  );
}
