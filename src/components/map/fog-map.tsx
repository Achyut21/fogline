"use client";

import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { fillFog } from "./fill-fog";
import { legal } from "@/copy";
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
import { shaderQuality, type FogRenderer } from "@/three/tier";

export type MapLine = {
  route: string;
  color: "red" | "orange" | "blue" | "green";
  coordinates: [number, number][];
};
export type MapStation = { id: string; name: string; lon: number; lat: number };
export type RevealAt = { point: { lat: number; lon: number }; serial: number };

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

function addNetwork(map: MapLibreMap, lines: readonly MapLine[], stations: readonly MapStation[]) {
  map.addSource("lines", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: lines.map((l) => ({
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
      features: stations.map((s) => ({
        type: "Feature",
        properties: { id: s.id, name: s.name },
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

// The map with the D-058 fog layer (or the 2D fill on low tiers), the T lines and stations above
// it. A tap on a station reports its ID.
export function FogMap({
  renderer,
  states,
  revealAt,
  lines,
  stations,
  center,
  zoom,
  label,
  onStation,
}: {
  renderer: Exclude<FogRenderer, "svg">;
  states: ReadonlyMap<string, CellState>;
  revealAt: RevealAt | null;
  lines: readonly MapLine[];
  stations: readonly MapStation[];
  center: { lat: number; lon: number };
  zoom: number;
  label: string;
  onStation?: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const live = useRef<{ map: MapLibreMap; field?: FogField; mask?: Uint8Array } | null>(null);
  const initial = useRef({ states, lines, stations, center, zoom });
  const tap = useRef(onStation);
  useEffect(() => {
    tap.current = onStation;
  }, [onStation]);
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
        center: [initial.current.center.lon, initial.current.center.lat],
        zoom: initial.current.zoom,
        dragRotate: false,
        pitchWithRotate: false,
        attributionControl: { compact: true, customAttribution: legal.mbta },
        pixelRatio: Math.min(window.devicePixelRatio, maxDpr),
      });
      map.touchZoomRotate.disableRotation();
      const m = map;
      m.on("load", () => {
        if (renderer === "map-fill") {
          addFillFog(m, initial.current.states);
          live.current = { map: m };
        } else {
          const mask = rasterizeFog(initial.current.states, fogBounds, maskSize);
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
        addNetwork(m, initial.current.lines, initial.current.stations);
        m.on("click", "stations", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "string") tap.current?.(id);
        });
        m.on("mouseenter", "stations", () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", "stations", () => {
          m.getCanvas().style.cursor = "";
        });
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
      aria-label={label}
      role="region"
    />
  );
}
