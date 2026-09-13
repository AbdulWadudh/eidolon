import { SQLITE_DB_PATH } from "@eidolon/config/server";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/tables.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.EIDOLON_DB_URL ?? SQLITE_DB_PATH,
  },
});
