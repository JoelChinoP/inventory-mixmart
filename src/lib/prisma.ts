import { PrismaClient } from "../../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { inventorySoftDeleteExtension } from "../../prisma/extensions/soft-delete.extension";
import { getDatabaseConnection } from "./database-url";

const { Pool } = pg;

const PRISMA_CLIENT_SCHEMA_VERSION = "20260430110000_store_user_avatar_in_database";

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getDefaultPoolSize(connectionString: string) {
  const databaseUrl = new URL(connectionString);

  if (
    databaseUrl.hostname.endsWith("pooler.supabase.com") ||
    process.env.VERCEL ||
    process.env.NODE_ENV === "production"
  ) {
    return 1;
  }

  return 5;
}

const prismaClientSingleton = () => {
  const database = getDatabaseConnection();
  const pool = new Pool({
    application_name: "inventory-mixmart",
    connectionString: database.connectionString,
    connectionTimeoutMillis: readPositiveInteger(
      process.env.DB_CONNECT_TIMEOUT_MS,
      5_000,
    ),
    idleTimeoutMillis: readPositiveInteger(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
    max: readPositiveInteger(
      process.env.DB_POOL_MAX,
      getDefaultPoolSize(database.connectionString),
    ),
  });
  const adapter = new PrismaPg(
    pool,
    {
      onPoolError: (error) => {
        console.error("Prisma PostgreSQL pool error", error);
      },
      schema: database.schema,
    },
  );
  const prismaRaw = new PrismaClient({ adapter });

  return {
    prisma: prismaRaw.$extends(inventorySoftDeleteExtension),
    prismaRaw,
    schemaVersion: PRISMA_CLIENT_SCHEMA_VERSION,
  };
};

declare const globalThis: {
  prismaGlobal?: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const cachedPrismaClients = globalThis.prismaGlobal;
const prismaClients =
  cachedPrismaClients?.schemaVersion === PRISMA_CLIENT_SCHEMA_VERSION
    ? cachedPrismaClients
    : prismaClientSingleton();
const prisma = prismaClients.prisma;

export default prisma;
export const prismaRaw = prismaClients.prismaRaw;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prismaClients;
