import { duration } from "@/lib/motion";

// The recap's order (DESIGN section 8): the podium rises, then names, then the numbers count up,
// then badges, then Share. Seconds from load; Share is in place by about 3 s.
const names = duration.reveal;
const numbers = names + duration.base;
const badges = numbers + duration.count;
const share = badges + duration.slow;

export const recapStage = { names, numbers, badges, share } as const;
