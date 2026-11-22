import type { Blocker } from "@/lib/solver/fair";
import { zone } from "@/lib/time";

// Plans (F4, F5, F6): the builder, the plan page, live mode and check-ins.

const clockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  hour: "numeric",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** "7:12 PM" in New York time, with a no-break space before AM or PM (COPY.md). */
export const clock = (at: Date) => clockFormat.format(at).replace(/\s/g, "\u00a0");

export const plans = {
  pageTitle: "Plans",
  weekly: {
    title: "This week",
    body: "Three nights out, fair for friends at five campuses. All ages.",
    invite: "Invite friends",
    inviting: "Making your copy",
    failed: "Couldn't copy this plan. Try again.",
    empty: "This week's plans come out Monday morning.",
  },
  list: {
    title: "Plans",
    new: "Plan a night",
    upcoming: "Upcoming",
    past: "Past",
    empty: {
      title: "No plans yet",
      body: "Add friends and their stations. Fogline finds spots that are fair by T time.",
    },
    when: (at: Date) => `${dayFormat.format(at)} · ${clock(at)}`,
    people: (n: number) => (n === 1 ? "1 person" : `${n} people`),
  },
  plan: {
    pageTitle: "Plan",
    back: "Plans",
    when: (at: Date) => `${dayFormat.format(at)} · ${clock(at)}`,
    adultsOnly: "This plan is 21+",
    hiddenTitle: "A 21+ plan",
    adultsOnlyBody:
      "The spot is a bar or club, so it's hidden for under-21 profiles and you can't join.",
    spot: "Spot",
    stops: (n: number) => `${n} stops`,
    people: "Who's going",
    placeholder: "Not on Fogline yet",
    formerMember: "Former member",
    remind: "Remind me",
    remindHelp: "Saves a calendar event with alarms 20 and 5 min before you have to leave.",
    leaveAlert: (minutes: number) => `Leave in ${minutes} min for your last train.`,
    recapLink: "See the night's recap",
    leaveByHidden: "Join to see when everyone has to leave.",
    join: "Join this plan",
    joining: "Joining",
    joinNeedsProfile: "Make a profile to join",
    invite: "Copy invite link",
    copied: "Invite link copied",
    share: (title: string) => `Join my Fogline plan: ${title}`,
    live: "Live",
    leaveIn: "Leave in",
    startsIn: "Starts in",
    checkIn: "Check in",
    primer: {
      title: "Fogline needs your location to check you in",
      body: "It's read once, now, to confirm you're within 150 m of the spot. Fogline saves this check-in's position and time, nothing else, and never tracks you.",
      continue: "Continue",
    },
    checkingIn: "Checking your location",
    checkedIn: "You're checked in. The fog around this spot is gone.",
    checkInResult: {
      "too-far": (meters: number) => `You're about ${meters} m away. Get within 150 m of the spot.`,
      "low-accuracy": (meters: number) =>
        `Your location is only accurate to ${meters} m. Step outside and try again.`,
      "too-early": (at: Date) => `Check-in opens at ${clock(at)}.`,
      "plan-ended": "This plan has ended.",
      denied: "Location is off for Fogline. Turn it on in your browser settings to check in.",
      unavailable: "Couldn't get your location. Try again.",
      failed: "Couldn't reach Fogline. Check your connection and try again.",
    },
    arrivals: "Arrival order",
    noArrivals: "Nobody has checked in yet.",
    end: "End night",
    ending: "Ending",
    ended: "This plan has ended.",
    notFound: {
      title: "This plan doesn't exist",
      body: "The link may be cut off. Ask for it again.",
    },
    joinErrors: {
      ended: "This plan has ended.",
      "adults-only": "This plan is 21+.",
      "not-found": "This plan doesn't exist.",
      "no-profile": "Make a profile first.",
    },
  },
  builder: {
    pageTitle: "Plan a night",
    title: "Plan a night",
    back: "Back",
    you: (name: string) => `${name} (you)`,
    friends: "Friends",
    friendName: "Name",
    friendStation: "Their station",
    pickStation: "Pick a station",
    addFriend: "Add a friend",
    removeFriend: (name: string) => `Remove ${name || "friend"}`,
    time: "Start time",
    timeOption: (at: Date) => clock(at),
    what: "What kind of spot",
    find: "Find fair spots",
    finding: "Finding spots",
    needFriend: "Add at least one friend with a station.",
    needName: "Give every friend a name and a station.",
    options: "Fairest options",
    optionNote: "Ranked by the longest ride, then by how even the rides are.",
    option: (n: number) => `Option ${n}`,
    maxRide: (minutes: number) => `Longest ride ${minutes} min`,
    personMinutes: (minutes: number, transfers: number) =>
      transfers === 0
        ? `${minutes} min`
        : `${minutes} min · ${transfers} ${transfers === 1 ? "transfer" : "transfers"}`,
    spots: "Spots near the station",
    walk: (meters: number) => `about ${Math.max(1, Math.round(meters / 80))} min walk`,
    noTrain: (name: string, at: Date) => `No train home for ${name} after ${clock(at)}.`,
    noTrainAtAll: (name: string, walk: number) =>
      `No train gets ${name} home tonight. Split a ride, or walk ${walk} min.`,
    noTimetable: "No schedule for that night.",
    mode: "Plan",
    modes: { spot: "One spot", crawl: "Crawl" },
    crawl: {
      stops: "Stops",
      stop: (n: number) => `Stop ${n}`,
      title: (names: readonly string[]) => names.join(" → "),
      leg: (mode: "walk" | "T", minutes: number) =>
        mode === "walk" ? `${minutes} min walk` : `${minutes} min on the T`,
      hours: { closed: "Closed then", unknown: "Hours unknown" },
      toFirst: (minutes: number) => `${minutes} min to the first stop`,
      planTitle: (station: string) => `Crawl from ${station}`,
      blocker: {
        time: "Someone's ride to the first stop is over 75 min, or no train runs then",
        "no-trains": "No trains run at that time",
        spots: "No open spots line up within 10 min of each other",
        "last-train": "The crawl would end after someone's last train",
      },
    },
    dinner: {
      offer: (title: string) => `Dinner before ${title}`,
      body: "The fairest spot within 10 min of the venue, then the event.",
      find: "Find dinner",
      title: "Dinner before",
      planTitle: (title: string) => `Dinner before ${title}`,
      unknownEvent: "That event isn't listed anymore.",
    },
    choose: "Make this the plan",
    creating: "Making the plan",
    planTitle: (station: string) => `Night at ${station}`,
    none: {
      title: "Nothing fits",
      body: "Loosen one of these and try again.",
      blocker: {
        budget: "The budget",
        minGrade: "The minimum food grade",
        categories: "The kinds of spot",
        time: "The start time: someone's ride is over 75 min or no train runs",
        "no-trains": "No trains run at that time",
        spots: "No spot is open near the fair stations",
      } satisfies Record<Blocker, string>,
      relax: "Allow every kind of spot",
      relaxGrade: "Allow any grade",
    },
    errors: {
      noProfile: "Make a profile first.",
      unknownSpot: "That spot moved. Find spots again.",
      adultsOnly: "This spot is 21+.",
      failed: "Couldn't reach Fogline. Check your connection and try again.",
    },
  },
} as const;
