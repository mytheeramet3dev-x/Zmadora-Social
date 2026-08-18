import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  socialPrismaV3: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/social";
  const pool = new Pool({
    connectionString,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
  });
}

export const prisma = globalForPrisma.socialPrismaV3 ?? createPrismaClient();

export function getPrismaClient() {
  return globalForPrisma.socialPrismaV3 ?? prisma;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.socialPrismaV3 = prisma;
}
export default prisma;
