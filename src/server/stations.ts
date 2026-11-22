import { z } from "zod";
import { stationSchema, type Station } from "@/lib/gtfs/types";
import raw from "../../data/stations.json";

export const stations: readonly Station[] = z.array(stationSchema).parse(raw);

const byId = new Map(stations.map((s) => [s.id, s]));

export function stationById(id: string): Station | undefined {
  return byId.get(id);
}
