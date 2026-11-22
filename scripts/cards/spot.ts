import type { StationCard } from "@/lib/cards";
import type { Place, PlaceCategory } from "@/lib/places/types";

// Cards are the same for everyone, so they never show a 21+ spot (F1.5). Categories rotate by
// station so neighboring cards don't all show food (DATA 2.4).
const rotation: readonly PlaceCategory[] = ["food", "coffee", "culture", "dessert", "park"];
const gradeRank = { A: 0, B: 2, C: 3 } as const;
const ungraded = 1;

/**
 * One all-ages spot near a station: the first category in this station's turn of the rotation
 * that has one, grade A first, then ungraded, then B and C, each nearest first.
 */
export function pickSpot(
  places: readonly Place[],
  station: string,
  turn: number,
): StationCard["spot"] {
  const near = places.filter(
    (p) => p.ageRule === "all" && p.stations.some((s) => s.id === station),
  );
  const walk = (p: Place) => p.stations.find((s) => s.id === station)?.walkM ?? Infinity;
  for (let i = 0; i < rotation.length; i++) {
    const category = rotation[(turn + i) % rotation.length];
    const [best] = near
      .filter((p) => p.category === category)
      .sort(
        (a, b) =>
          (a.grade ? gradeRank[a.grade.letter] : ungraded) -
            (b.grade ? gradeRank[b.grade.letter] : ungraded) ||
          walk(a) - walk(b) ||
          (a.id < b.id ? -1 : 1),
      );
    if (best) {
      return { id: best.id, name: best.name, category, grade: best.grade?.letter ?? null };
    }
  }
  return null;
}
