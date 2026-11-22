// Demo mode's seeded people and night (F16.1).
export const demo = {
  you: "You",
  friends: { harvard: "Priya", tufts: "Sam" },
  nightTitle: "Friday dinner",
  page: {
    title: "Try Fogline with sample data",
    body: "You get your own copy: a profile at BU, two friends at Harvard and Tufts, and a past night out together. Ride replays use real trains the MBTA tracked in the last 24 hours. Nothing you do here mixes with real profiles, and the copy is deleted after 24 hours.",
    start: "Start demo",
    starting: "Setting up",
    failed: "Couldn't set up the demo. The rest of Fogline still works. Try again.",
    busy: "Too many demos started in the last hour. Try again in a few minutes.",
    signedIn: (name: string) =>
      `This device has ${name}'s profile. The demo replaces it here. Copy your profile code from Me first.`,
    me: "Open Me",
  },
} as const;
