import { clock } from "./plans";

// "Remind me" calendar events (F5.8): an event at the leave-by time, with alarms 20 and 5 minutes
// before it, so the reminder fires with the app closed.
export const reminder = {
  summary: (leaveBy: Date) => `Leave by ${clock(leaveBy)}`,
  description: (plan: string, station: string, departs: Date) =>
    `${plan}. Your last train home leaves ${station} at ${clock(departs)}.`,
  alarm: (minutes: number) => `Leave in ${minutes} min for your last train.`,
  filename: "fogline-leave-by.ics",
} as const;
