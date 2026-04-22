import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to apply database rules.");
}

const schema = (() => {
  const url = new URL(connectionString);
  return url.searchParams.get("schema") ?? "public";
})();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "..", "prisma", "sql", "business-rules.sql");
const sql = await readFile(sqlPath, "utf8");
const quotedSchema = `"${schema.replace(/"/g, "\"\"")}"`;

const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query(`SET search_path TO ${quotedSchema}, public`);
  await client.query(sql);
  console.log(`Database rules applied to schema ${schema}.`);
} finally {
  await client.end();
}
