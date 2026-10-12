import { resolve } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
  const client = postgres(databaseUrl, { max: 1 });

  try {
    await migrate(drizzle(client), { migrationsFolder: resolve("drizzle") });
    console.log("Database ready");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error && "code" in error && error.code === "ECONNREFUSED") {
    console.error(
      "Could not connect to PostgreSQL. Start your local database or set DATABASE_URL to a reachable hosted database.",
    );
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
