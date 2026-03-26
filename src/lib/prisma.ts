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

export const prisma = globalForPrisma.socialPrismaV2 ?? createPrismaClient();

export function getPrismaClient() {
  return globalForPrisma.socialPrismaV2 ?? prisma;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.socialPrismaV2 = prisma;
}
export default prisma;
