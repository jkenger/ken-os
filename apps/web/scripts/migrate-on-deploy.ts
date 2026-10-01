// Runs on Vercel after a successful build (see apps/web/vercel.json). Only production deploys migrate: preview
// deploys skip it so a branch can never change the production schema. A failed migration fails the deploy, and the
// previous deployment stays live.
//
// The new schema is live slightly before the new code, so every migration must keep working with the code already
// deployed: add tables and columns first, remove old ones in a later release.
const target = process.env.VERCEL_ENV;

if (target !== "production") {
  console.log(`Skipping database migrations: VERCEL_ENV is ${target ?? "not set"}, not production.`);
} else {
  console.log("Production deploy: applying pending database migrations.");
  void import("./migrate");
}
