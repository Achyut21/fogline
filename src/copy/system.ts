export const system = {
  offlineBanner: "You're offline. Your map and saved plans still work.",
  stale: (minutes: number) => (minutes < 1 ? "Updated just now" : `Updated ${minutes} min ago`),
  demo: "Demo",
  stepper: {
    decrease: (label: string) => `${label}: one less`,
    increase: (label: string) => `${label}: one more`,
  },
  offline: {
    title: "You're offline",
    body: "This page isn't saved for offline use. Reconnect, then try again.",
    retry: "Try again",
  },
  error: {
    title: "This page didn't load",
    body: "Try again. If it keeps failing, go to the home page.",
    homeBody: "Try again. If it keeps failing, close Fogline and open it again.",
    retry: "Try again",
    home: "Home page",
  },
  appError: {
    title: "Fogline didn't load",
    body: "Try again. If it keeps failing, close Fogline and open it again.",
    retry: "Try again",
  },
  notFound: {
    title: "No page at this address",
    body: "Check the link, or go to the home page.",
    home: "Home page",
  },
} as const;
