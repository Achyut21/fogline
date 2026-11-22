"use client";

import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { FogFallback } from "@/components/map/fog-fallback";
import { fillFog } from "@/components/map/fill-fog";
import { fog, legal } from "@/copy";
import type { CellState } from "@/lib/geo/cells";
import {
  createFogField,
  fogBounds,
  maskAspect,
  maskSize,
  maskUv,
  type FogField,
} from "@/three/fog-field";
import { fogLayer } from "@/three/fog-layer";
import { rasterizeFog, revealReach } from "@/three/mask";
import { fogMaterial, maskTexture } from "@/three/materials/fog-material";
import { fogRenderer, shaderQuality, type FogRenderer } from "@/three/tier";
import { nextStops, revealStep, sampleStates, stationPoint } from "./sample-fog";
import { sampleLines, sampleStations } from "./sample-network";

// Turbopack serves MapLibre 6's worker from this URL (MapLibre docs, "Turbopack (Next.js)").
const workerUrl = new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString();

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

function baseStyle(): StyleSpecification {
  return {
    version: 8,
    sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
    layers: [
      { id: "land", type: "background", paint: { "background-color": token("map-land") } },
      {
        id: "park",
        type: "fill",
        source: "omt",
        "source-layer": "park",
        paint: { "fill-color": token("map-park") },
      },
      {
        id: "water",
        type: "fill",
        source: "omt",
        "source-layer": "water",
        paint: { "fill-color": token("map-water") },
      },
      {
        id: "roads",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: [
          "in",
          ["get", "class"],
          ["literal", ["primary", "secondary", "tertiary", "minor", "trunk", "motorway"]],
        ],
        paint: {
          "line-color": token("map-road"),
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 15, 3],
        },
      },
    ],
  };
}

function colorMatch(suffix: "" | "-casing"): ExpressionSpecification {
  return [
    "match",
    ["get", "color"],
    "red",
    token(`line-red${suffix}`),
    "orange",
    token(`line-orange${suffix}`),
    "blue",
    token(`line-blue${suffix}`),
    "green",
    token(`line-green${suffix}`),
    token("ink"),
  ];
}

// Casings stay 2 px wider than the line on each side at every zoom (DESIGN section 10).
function zoomWidth(low: number, high: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 11, low, 15, high];
}

function addNetwork(map: MapLibreMap) {
  map.addSource("lines", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: sampleLines.map((l) => ({
        type: "Feature",
        properties: { color: l.color },
        geometry: { type: "LineString", coordinates: l.coordinates },
      })),
    },
  });
  map.addSource("stations", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: sampleStations.map((s) => ({
        type: "Feature",
        properties: { name: s.name },
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      })),
    },
  });
  map.addLayer({
    id: "line-casing",
    type: "line",
    source: "lines",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": colorMatch("-casing"),
      "line-width": zoomWidth(6.5, 10),
    },
  });
  map.addLayer({
    id: "line",
    type: "line",
    source: "lines",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": colorMatch(""), "line-width": zoomWidth(2.5, 6) },
  });
  map.addLayer({
    id: "stations",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2, 15, 5],
      "circle-color": token("surface"),
      "circle-stroke-color": token("ink"),
      "circle-stroke-width": 1.2,
    },
  });
}

function addFillFog(map: MapLibreMap, states: ReadonlyMap<string, CellState>) {
  const data = fillFog(states);
  map.addSource("fog", { type: "geojson", data: data.fog });
  map.addSource("fog-seen", { type: "geojson", data: data.seen });
  map.addLayer({
    id: "fog",
    type: "fill",
    source: "fog",
    paint: { "fill-color": token("fog"), "fill-opacity": 0.92 },
  });
  map.addLayer({
    id: "fog-seen",
    type: "fill",
    source: "fog-seen",
    paint: { "fill-color": token("fog"), "fill-opacity": 0.45 },
  });
}

function MapStage({
  renderer,
  states,
  revealAt,
}: {
  renderer: Exclude<FogRenderer, "svg">;
  states: ReadonlyMap<string, CellState>;
  revealAt: { point: { lat: number; lon: number }; serial: number } | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const live = useRef<{ map: MapLibreMap; field?: FogField; mask?: Uint8Array } | null>(null);
  const initial = useRef(states);
  // The 3D budget clamps device pixels (DESIGN section 9). The fog layer draws into MapLibre's own
  // canvas, so the clamp applies to the whole map.
  const maxDpr = renderer === "map-fill" ? 2 : shaderQuality[renderer].maxDpr;

  useEffect(() => {
    let disposed = false;
    let map: MapLibreMap | undefined;
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void import("maplibre-gl").then((maplibre) => {
      if (disposed || !container.current) return;
      maplibre.setWorkerUrl(workerUrl);
      map = new maplibre.Map({
        container: container.current,
        style: baseStyle(),
        center: [-71.09, 42.36],
        zoom: 12.2,
        dragRotate: false,
        pitchWithRotate: false,
        attributionControl: { compact: true, customAttribution: legal.mbta },
        pixelRatio: Math.min(window.devicePixelRatio, maxDpr),
      });
      map.touchZoomRotate.disableRotation();
      const m = map;
      m.on("load", () => {
        if (renderer === "map-fill") {
          addFillFog(m, initial.current);
          live.current = { map: m };
        } else {
          const mask = rasterizeFog(initial.current, fogBounds, maskSize);
          const material = fogMaterial({
            mask: maskTexture(mask, maskSize),
            octaves: shaderQuality[renderer].octaves,
            aspect: maskAspect,
            colors: { fog: token("fog"), edge: token("fog-edge") },
          });
          const field = createFogField(material, reduced);
          m.addLayer(fogLayer(material, field));
          live.current = { map: m, field, mask };
          const point = (uv: [number, number] | null) => {
            field.point(uv);
            m.triggerRepaint();
          };
          const pointer = (e: { lngLat: { lng: number; lat: number } }) =>
            point(maskUv(e.lngLat.lng, e.lngLat.lat));
          m.on("mousemove", pointer);
          m.on("touchmove", pointer);
          m.on("mouseout", () => point(null));
          m.on("touchend", () => point(null));
        }
        addNetwork(m);
      });
    });
    return () => {
      disposed = true;
      live.current = null;
      // map.remove() skips a custom layer's onRemove, which disposes the fog's GPU resources.
      if (map?.getLayer("fog")) map.removeLayer("fog");
      map?.remove();
    };
  }, [renderer, maxDpr]);

  useEffect(() => {
    const current = live.current;
    if (!revealAt || !current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (current.field && current.mask) {
      const mask = rasterizeFog(states, fogBounds, maskSize);
      const center = maskUv(revealAt.point.lon, revealAt.point.lat);
      const reach = revealReach(current.mask, mask, maskSize, center, maskAspect);
      current.field.reveal(maskTexture(mask, maskSize), center, reach, reduced);
      current.mask = mask;
      current.map.triggerRepaint();
    } else {
      const data = fillFog(states);
      current.map.getSource<GeoJSONSource>("fog")?.setData(data.fog);
      current.map.getSource<GeoJSONSource>("fog-seen")?.setData(data.seen);
    }
  }, [revealAt, states]);

  return (
    <div
      ref={container}
      className="h-full w-full"
      data-renderer={renderer}
      aria-label={fog.mapLabel(states.size)}
      role="img"
    />
  );
}

export function FogSpike({ tierOverride }: { tierOverride: number | null }) {
  // FogPreview loads this component in the browser only, so document exists here.
  const [webgl] = useState(() => Boolean(document.createElement("canvas").getContext("webgl2")));
  const [tier, setTier] = useState<number | null>(tierOverride);
  const [failed, setFailed] = useState(false);
  const [states, setStates] = useState(sampleStates);
  const [step, setStep] = useState(0);
  const [revealAt, setRevealAt] = useState<{
    point: { lat: number; lon: number };
    serial: number;
  } | null>(null);

  useEffect(() => {
    if (tierOverride !== null) return;
    void import("@pmndrs/detect-gpu")
      .then(({ getGPUTier }) => getGPUTier({ benchmarksURL: "/detect-gpu" }))
      .then((result) => setTier(result.tier))
      .catch(() => {
        setFailed(true);
        setTier(1);
      });
  }, [tierOverride]);

  const renderer = tier === null ? null : fogRenderer({ webgl, tier, force2d: false });

  function reveal() {
    const name = nextStops[step % nextStops.length];
    const point = stationPoint(name);
    setStates((current) => revealStep(current, "ride", point));
    setStep((s) => s + 1);
    setRevealAt({ point, serial: step });
  }

  return (
    <main className="flex h-dvh flex-col bg-bg">
      <header className="flex flex-col gap-2 border-b border-rule bg-surface px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold">{fog.previewTitle}</h1>
        <p className="text-sm text-ink-muted">{fog.sampleNote}</p>
        <p className="text-sm text-ink-muted" data-testid="renderer">
          {failed
            ? fog.tierFailed
            : renderer && tier !== null
              ? fog.status(fog.rendererName[renderer], tier)
              : fog.checking}
        </p>
        <button
          type="button"
          onClick={reveal}
          disabled={!renderer}
          className="min-h-11 rounded-full bg-accent px-5 font-bold text-accent-ink disabled:opacity-50"
        >
          {fog.reveal}
        </button>
      </header>
      <div className="relative flex-1">
        {renderer === "svg" && (
          <FogFallback states={states} lines={sampleLines} stations={sampleStations} />
        )}
        {renderer && renderer !== "svg" && (
          <MapStage renderer={renderer} states={states} revealAt={revealAt} />
        )}
      </div>
    </main>
  );
}
