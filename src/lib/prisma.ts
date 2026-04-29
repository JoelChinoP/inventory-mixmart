import { PrismaClient } from "../../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { inventorySoftDeleteExtension } from "../../prisma/extensions/soft-delete.extension";
import { getDatabaseConnection } from "./database-url";

const PRISMA_CLIENT_SCHEMA_VERSION = "20260429103000_add_user_avatar";

const prismaClientSingleton = () => {
  const database = getDatabaseConnection();
  const adapter = new PrismaPg(
    {
      connectionString: database.connectionString,
    },
    {
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
