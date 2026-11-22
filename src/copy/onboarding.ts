// Onboarding, restore and Me (F1), worded as on the canvas onboarding artboards.
export const onboarding = {
  pageTitle: "Welcome",
  step: (n: number) => `${n} of 4`,
  back: "Back",
  next: "Next",
  welcome: {
    title: "Boston is under fog.",
    body: "Ride the T and go out with friends to clear it. No account, no email.",
    nameLabel: "Your name",
    nameHelp: "Friends see this on plans.",
    restore: "Restore profile",
  },
  school: {
    title: "Your school",
    label: "School",
  },
  station: {
    title: "Home station",
    body: "Where your trips home end. The fog clears here first.",
    near: (school: string) => `Near ${school}`,
    suggested: "Suggested",
    other: "Another station",
    pick: "Pick a station",
  },
  age: {
    title: "Your age",
    body: "Plans for under-21 profiles never include bars or clubs.",
    label: "Age",
    under21: "Under 21",
    over21: "21 or older",
    help: "Change this in Me, Settings. Nobody checks an ID.",
    submit: "Show map",
  },
  invalid: "Your profile didn't save. Check your school and home station, then try again.",
  restore: {
    title: "Restore profile",
    body: "Enter the 8-character code from Me on your other device. Your map, plans and badges come with it.",
    label: "Profile code",
    help: "Letters and numbers only. No 0, O, 1, I or L.",
    submit: "Restore",
    notFound:
      "No profile has that code. Check the 8 characters on your other device and try again.",
  },
  me: {
    title: "Me",
    school: "School",
    home: "Home station",
    codeLabel: "Profile code",
    codeHelp: "Enter this code on another device to bring your map, plans and badges.",
  },
} as const;
