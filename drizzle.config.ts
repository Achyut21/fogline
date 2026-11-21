import { defineConfig } from "drizzle-kit";

// Migrations never use DATABASE_URL: the target is named on the command line, e.g.
// MIGRATE_DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres pnpm db:migrate.
// drizzle-kit loads .env, so keep MIGRATE_DATABASE_URL out of it (D-043).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.MIGRATE_DATABASE_URL ?? "" },
});
