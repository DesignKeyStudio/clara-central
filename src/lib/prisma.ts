import { PrismaClient } from "@prisma/client";

import { MODEL_ID_PREFIXES, newId } from "./ids";

/**
 * Auto-assign a TypeID `id` to a row payload when the model uses prefixed IDs
 * and no id was provided explicitly. Mutates `data` in place.
 */
function assignTypeId(model: string | undefined, data: unknown): void {
  if (!model || typeof data !== "object" || data === null) return;
  const prefix = MODEL_ID_PREFIXES[model];
  if (!prefix) return;
  const row = data as Record<string, unknown>;
  if (row.id == null) row.id = newId(prefix);
}

const createPrismaClient = () =>
  new PrismaClient().$extends({
    query: {
      $allModels: {
        create({ model, args, query }) {
          assignTypeId(model, args.data);
          return query(args);
        },
        upsert({ model, args, query }) {
          assignTypeId(model, args.create);
          return query(args);
        },
        createMany({ model, args, query }) {
          const rows = Array.isArray(args.data) ? args.data : args.data ? [args.data] : [];
          for (const row of rows) assignTypeId(model, row);
          return query(args);
        },
      },
    },
  });

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
