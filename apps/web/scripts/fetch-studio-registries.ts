import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RegistrySnapshot } from "../src/features/design-studio/manifest";

// Fetches the component libraries the Design Studio lists beside this repo (docs/architecture/design-studio.md) into a
// committed snapshot, so studio:generate, pnpm check and the build never depend on a registry being up. Run it by hand
// with pnpm --filter @ken-os/web studio:registries, then studio:generate.

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = resolve(webRoot, "src/features/design-studio/registries.snapshot.json");

/** shadcn/ui's source on GitHub: `public/r/index.json` is what ui.shadcn.com/r/index.json serves, and the docs pages'
 *  frontmatter holds the one-line descriptions the registry JSON leaves out. */
const shadcnSource = "https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4";

type IndexItem = {
  name: string;
  type: string;
  registryDependencies?: string[];
  meta?: { links?: Record<string, { docs?: string }> };
};

async function get(url: string) {
  const response = await fetch(url);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`${url} answered ${response.status}.`);
  return response.text();
}

/** shadcn/ui's components for this repo's base (the "radix" of "radix-luma"), with their docs descriptions. */
async function readShadcn(base: string) {
  const index = JSON.parse((await get(`${shadcnSource}/public/r/index.json`)) ?? "[]") as IndexItem[];
  const items = index.filter((item) => item.type === "registry:ui" && item.meta?.links?.[base]);
  return Promise.all(
    items.map(async (item) => {
      const docs = await get(`${shadcnSource}/content/docs/components/${base}/${item.name}.mdx`);
      const description = docs && /^---\n[\s\S]*?^description: (.+)$/m.exec(docs.replace(/\r\n/g, "\n"))?.[1].trim();
      return {
        name: item.name,
        ...(description ? { description } : {}),
        uses: item.registryDependencies ?? [],
        ...(item.meta?.links?.[base]?.docs ? { docs: item.meta.links[base].docs } : {}),
      };
    }),
  );
}

const config = JSON.parse(readFileSync(resolve(webRoot, "components.json"), "utf8")) as { style: string };
const base = config.style.split("-")[0];

async function main() {
  const snapshot: RegistrySnapshot = {
    libraries: [{ id: "shadcn", name: "shadcn/ui", items: await readShadcn(base) }],
  };
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(
    `Studio registries fetched: ${snapshot.libraries.map((library) => `${library.name} ${library.items.length}`).join(", ")}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
