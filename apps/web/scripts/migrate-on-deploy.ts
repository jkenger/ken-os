// Runs on Vercel after a successful build (see apps/web/vercel.json). Production deploys migrate the production
// database. Preview deploys migrate the shared preview database: the Preview DATABASE_URL variables point at a
// separate Neon database, so a branch can never change the production schema. A failed migration fails the deploy,
// and the previous deployment stays live.
//
// The new schema is live slightly before the new code, so every migration must keep working with the code already
// deployed: add tables and columns first, remove old ones in a later release. On the shared preview database that
// also covers previews of older branches.
const target = process.env.VERCEL_ENV;

if (target !== "production" && target !== "preview") {
  console.log(`Skipping database migrations: VERCEL_ENV is ${target ?? "not set"}, not production or preview.`);
} else {
  console.log(`${target === "production" ? "Production" : "Preview"} deploy: applying pending database migrations.`);
  void import("./migrate");
}
