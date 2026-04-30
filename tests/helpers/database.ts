import { execFileSync } from "node:child_process";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "../../prisma/generated/client";

const { Client } = pg;

const DEFAULT_TEST_DATABASE_URL =
  "postgresql://myuser:mypassword@127.0.0.1:5420/mydb?sslmode=disable&schema=public";

const TABLES = [
  "stock_movements",
  "service_consumptions",
  "service_records",
  "service_type_supplies",
  "service_types",
  "stock_output_items",
  "stock_outputs",
  "stock_entry_items",
  "stock_entries",
  "product_suppliers",
  "products",
  "suppliers",
  "users",
];

export type TestDatabase = {
  schemaClient: pg.Client;
  prisma: PrismaClient;
  schemaName: string;
  schemaUrl: string;
};

export function buildTestDatabaseUrl() {
  const schemaUrl = new URL(
    process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL,
  );
  const schemaName = schemaUrl.searchParams.get("schema") ?? "public";
  const adminUrl = new URL(schemaUrl.toString());
  adminUrl.searchParams.delete("schema");

  return {
    schemaName,
    schemaUrl: schemaUrl.toString(),
    adminUrl: adminUrl.toString(),
  };
}

export async function setupTestDatabase(): Promise<TestDatabase> {
  const { schemaName, schemaUrl, adminUrl } = buildTestDatabaseUrl();
  Object.assign(process.env, {
    NODE_ENV: "test",
    TEST_DATABASE_URL: schemaUrl,
  });

  execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "db",
      "push",
      "--schema",
      "prisma/schema.prisma",
      "--url",
      schemaUrl,
      "--force-reset",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "test",
        TEST_DATABASE_URL: schemaUrl,
      },
      stdio: "pipe",
    },
  );

  execFileSync(process.execPath, ["scripts/apply-database-rules.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "test",
      TEST_DATABASE_URL: schemaUrl,
    },
  });

  const schemaClient = new Client({ connectionString: adminUrl });
  await schemaClient.connect();
  await schemaClient.query(
    `SET search_path TO "${schemaName.replace(/"/g, "\"\"")}", public`,
  );

  const adapter = new PrismaPg({
    connectionString: adminUrl,
  }, {
    schema: schemaName,
  });
  const prisma = new PrismaClient({ adapter });

  return {
    schemaClient,
    prisma,
    schemaName,
    schemaUrl,
  };
}

export async function resetTestDatabase(db: TestDatabase) {
  await db.schemaClient.query(
    `TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`,
  );
}

export async function teardownTestDatabase(db: TestDatabase) {
  await db.prisma.$disconnect();
  await db.schemaClient.end();
}

export async function expectDbError(
  action: Promise<unknown>,
  messageIncludes: string,
) {
  try {
    await action;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    if (!message.includes(messageIncludes)) {
      throw new Error(
        `Expected error message to include "${messageIncludes}", received "${message}"`,
      );
    }
    return;
  }

  throw new Error(`Expected database error containing "${messageIncludes}"`);
}

export function decimalToNumber(
  value: { toNumber: () => number } | number | string | null,
) {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}
