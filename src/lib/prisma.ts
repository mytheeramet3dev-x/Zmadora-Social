import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  socialPrismaV2: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

function createPrismaClient() {
  return new PrismaClient({
    adapter,
  });
}

export const prisma =
  globalForPrisma.socialPrismaV2 ??
  createPrismaClient();

export function getPrismaClient() {
  const client = globalForPrisma.socialPrismaV2 ?? prisma;

  // Hot reload can leave us with an older generated client shape in memory.
  if (typeof (client as PrismaClient & { directMessage?: unknown }).directMessage === "undefined") {
    const freshClient = createPrismaClient();

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.socialPrismaV2 = freshClient;
    }

    return freshClient;
  }

  return client;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.socialPrismaV2 = prisma;
}
export default prisma;
