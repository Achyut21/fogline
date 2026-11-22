// The in-app leave-by alerts (F5.4): at 20 and 5 minutes before your leave-by. One alert at a
// time: opening a plan with 3 minutes left fires the 5-minute alert once, not both.

export const leaveAlertMinutes = [20, 5] as const;

/**
 * The alert due now, or null: the smallest threshold at or above the minutes left that hasn't
 * fired, with every larger one counted as fired too.
 */
export function dueLeaveAlert(minutesLeft: number, fired: Set<number>): number | null {
  if (minutesLeft <= 0) return null;
  const due = leaveAlertMinutes.filter((at) => minutesLeft <= at && !fired.has(at));
  if (due.length === 0) return null;
  for (const at of leaveAlertMinutes) if (minutesLeft <= at) fired.add(at);
  return Math.min(...due);
}
