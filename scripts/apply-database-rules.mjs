import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to apply database rules.");
}

const connectionUrl = new URL(connectionString);
const schema = (() => {
  return connectionUrl.searchParams.get("schema") ?? "public";
})();

const sslMode = (() => {
  const mode = connectionUrl.searchParams.get("sslmode");
  connectionUrl.searchParams.delete("sslmode");
  return mode;
})();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "..", "prisma", "sql", "business-rules.sql");
const sql = await readFile(sqlPath, "utf8");
const quotedSchema = `"${schema.replace(/"/g, "\"\"")}"`;

const ruleFunctionNames = [
  "after_insert_service_consumption",
  "after_insert_service_record",
  "after_insert_stock_entry_item",
  "after_insert_stock_output_item",
  "after_receive_stock_entry",
  "apply_received_stock_entry_item",
  "consume_product_stock",
  "guard_received_stock_entry_item_mutations",
  "guard_service_record_mutations",
  "guard_service_type_kind_mutation",
  "prepare_stock_entry",
  "prepare_stock_output_item",
  "prevent_history_delete",
  "prevent_service_consumption_mutation",
  "prevent_stock_movement_mutation",
  "prevent_stock_output_item_mutation",
  "validate_service_record_kind",
];

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

const client = new Client({
  connectionString: connectionUrl.toString(),
  ...(sslMode && sslMode !== "disable"
    ? { ssl: { rejectUnauthorized: sslMode === "verify-full" } }
    : {}),
});

try {
  await client.connect();
  await client.query(`SET search_path TO ${quotedSchema}, public`);
  await client.query(sql);
  const functions = await client.query(
    `
      SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = $1
        AND p.proname = ANY($2::text[])
      ORDER BY p.proname
    `,
    [schema, ruleFunctionNames],
  );

  for (const row of functions.rows) {
    await client.query(
      `ALTER FUNCTION ${quotedSchema}.${quoteIdentifier(row.proname)}(${row.args}) SET search_path TO ${quotedSchema}, public`,
    );
  }

  console.log(`Database rules applied to schema ${schema}.`);
} finally {
  await client.end();
}
