import { defineConfig } from "drizzle-kit";

// Migrations never pick up DATABASE_URL from .env: the target must be named on the command line,
// e.g. MIGRATE_DATABASE_URL=$DATABASE_URL_TEST pnpm db:migrate (D-043).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.MIGRATE_DATABASE_URL ?? "" },
});
