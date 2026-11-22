export const system = {
  offlineBanner:
    "You're offline. Screens you opened recently still show; the rest needs a connection.",
  stale: (minutes: number) =>
    minutes < 1 ? "Updated just now" : `Updated ${Math.floor(minutes)} min ago`,
  demo: "Demo",
  stepper: {
    decrease: (label: string) => `${label}: one less`,
    increase: (label: string) => `${label}: one more`,
  },
  offline: {
    title: "You're offline",
    body: "This page isn't saved for offline use. Reconnect, then try again.",
    retry: "Try again",
    map: "Go to the map",
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
  update: { title: "Update ready", refresh: "Refresh" },
  install: {
    title: "Add Fogline to your home screen",
    body: "It opens full screen and keeps your map ready offline.",
    install: "Install",
    iosSteps: "Tap Share, then Add to Home Screen.",
    iosCode:
      "The installed app starts fresh: copy your profile code from Me first, then enter it there.",
    notNow: "Not now",
  },
} as const;
