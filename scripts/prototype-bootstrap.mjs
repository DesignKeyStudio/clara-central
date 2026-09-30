#!/usr/bin/env node
/**
 * Prototype bootstrap — resets the SQLite DB on each `pnpm dev` start.
 *
 * Activated when NEXT_PUBLIC_PROTOTYPE_MODE === "true". Run as a `predev` hook
 * (or directly) to delete the SQLite file, push the schema, and run the seed.
 *
 * Why file-backed rather than `file::memory:`? Prisma's in-memory SQLite is
 * per-connection, so the Next.js server, Prisma Studio, and any external
 * tooling each see different "in-memory" DBs. A file at `prisma/prototype.db`
 * deleted-on-boot gives the same "fresh on every restart" semantics with no
 * connection-sharing footguns.
 */

import { existsSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const PROTOTYPE_MODE = process.env.NEXT_PUBLIC_PROTOTYPE_MODE === "true";
const DB_PATH = resolve(process.cwd(), "prisma", "prototype.db");

if (!PROTOTYPE_MODE) {
  console.log("[prototype-bootstrap] NEXT_PUBLIC_PROTOTYPE_MODE is not 'true' — skipping. Use `prisma migrate dev` for real DB modes.");
  process.exit(0);
}

console.log("[prototype-bootstrap] Resetting SQLite DB at", DB_PATH);

if (existsSync(DB_PATH)) {
  try {
    unlinkSync(DB_PATH);
    console.log("[prototype-bootstrap] Deleted previous DB file");
  } catch (err) {
    console.error("[prototype-bootstrap] Could not delete previous DB file:", err);
    process.exit(1);
  }
}

const run = (cmd, args) => {
  console.log(`[prototype-bootstrap] $ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`[prototype-bootstrap] Command failed with exit ${result.status}`);
    process.exit(result.status ?? 1);
  }
};

// Push schema (no migration files for prototype — schema lives only in source)
run("pnpm", ["exec", "prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);

// Run seed
run("pnpm", ["exec", "prisma", "db", "seed"]);

console.log("[prototype-bootstrap] Done. Demo user is ready.");
