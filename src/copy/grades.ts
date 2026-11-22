// Food inspection grades (F11).

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const grades = {
  letter: (letter: string) => `Grade ${letter}`,
  inspected: (date: string) => `inspected ${dateFormat.format(new Date(`${date}T00:00:00Z`))}`,
  noMatch: "No inspection match",
  details: "Inspection details",
  loading: "Loading the inspection",
  failed: "Couldn't load the inspection. Try again.",
  none: "No violations cited.",
  violations: (n: number) => (n === 1 ? "1 violation cited" : `${n} violations cited`),
  level: { "*": "Minor", "**": "Serious", "***": "Most serious" },
  minGrade: "Food grade",
  minGradeOptions: { any: "Any", B: "B or better", A: "A only" },
} as const;
