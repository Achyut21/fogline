type Level = "info" | "warn" | "error";
type Context = Record<string, string | number | boolean | null>;
type Described = { name: string; message: string; stack: string | null; cause?: Described };

const maxCauseDepth = 3;

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch (error) {
    if (error instanceof TypeError) return String(value);
    throw error;
  }
}

function describe(error: unknown, depth = 0): Described {
  if (!(error instanceof Error)) {
    return { name: "NonError", message: stringify(error), stack: null };
  }
  const described: Described = {
    name: error.name,
    message: error.message,
    stack: error.stack ?? null,
  };
  if (error.cause !== undefined && depth < maxCauseDepth) {
    described.cause = describe(error.cause, depth + 1);
  }
  return described;
}

function write(level: Level, message: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({ ...fields, level, message, time: new Date().toISOString() });
  console[level](line);
}

export const log = {
  info(message: string, context: Context = {}) {
    write("info", message, context);
  },
  warn(message: string, context: Context = {}) {
    write("warn", message, context);
  },
  error(message: string, error: unknown, context: Context = {}) {
    write("error", message, { ...context, error: describe(error) });
  },
};
