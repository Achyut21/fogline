"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { calm } from "@/copy";
import { clock } from "@/copy/plans";
import { serviceTimeToDate } from "@/lib/time";
import { stationSensory } from "@/server/actions/noise";

const s = calm.sensory;

/** A station's sensory preview (F13.5): only what riders measured, and a plain "no data" else. */
export function SensoryPreview({ station }: { station: string }) {
  const { data } = useQuery({
    queryKey: ["sensory", station],
    queryFn: () => stationSensory(station),
    staleTime: 5 * 60_000,
  });
  return (
    <section aria-labelledby="sensory" className="flex flex-col gap-2">
      <h3 id="sensory" className="text-lg font-extrabold tracking-tight">
        {s.title}
      </h3>
      <ul className="flex flex-col gap-1 text-sm">
        <li>{data?.sound ? s.sound(data.sound.loudness, data.sound.readings) : s.noSound}</li>
        {/* Any day works: only the hour is shown. */}
        {data?.quietestHour != null && (
          <li>{s.quietest(clock(serviceTimeToDate("2026-01-05", data.quietestHour * 3600)))}</li>
        )}
        <li className="text-ink-muted">{s.crowds}</li>
        <li className="text-ink-muted">{s.waiting}</li>
      </ul>
      <Link href="/calm" className="text-sm font-semibold text-accent underline">
        {s.measure}
      </Link>
    </section>
  );
}
