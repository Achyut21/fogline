export const system = {
  offline: {
    title: "You're offline",
    body: "Fogline doesn't work offline yet. Reconnect, then try again.",
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
