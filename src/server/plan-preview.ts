import { planImage as copy, plans as planCopy } from "@/copy";

type Plan = {
  title: string | null;
  startsAt: string;
  isDemo: boolean;
  adultsOnly: boolean;
  spot: { name: string } | null;
  stops: { name: string }[];
  people: { rsvp: string }[];
};

/**
 * What an invite link's preview shows (F4.8): title, time, spot and how many are in. It's the
 * same for everyone who holds the link, so a cache can't hand one viewer's version to another, and
 * a 21+ plan always hides its title and venue (F4.9).
 */
export function planPreview(plan: Plan) {
  const [first, ...rest] = plan.stops;
  const hidden = plan.adultsOnly;
  return {
    demo: plan.isDemo,
    title: hidden ? copy.hiddenTitle : (plan.title ?? copy.hiddenTitle),
    when: planCopy.plan.when(new Date(plan.startsAt)),
    spot: hidden ? copy.hiddenSpot : (first?.name ?? plan.spot?.name ?? copy.hiddenSpot),
    more: !hidden && rest.length > 0 ? copy.moreStops(rest.length) : null,
    people: copy.people(plan.people.filter((p) => p.rsvp !== "no").length),
  };
}
