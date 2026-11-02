import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { requiredEnv } from "../config";
import * as schema from "./schema";

function connect() {
  client = postgres(requiredEnv("DATABASE_URL"), { max: 5 });
  return drizzle({ client, schema });
}

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof connect> | undefined;

export function db() {
  database ??= connect();
  return database;
}

export async function closeDb() {
  await client?.end();
  client = undefined;
  database = undefined;
}
