import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  kebab,
  libraryItems,
  pascal,
  type RegistrySnapshot,
  type StudioComponent,
  type StudioManifest,
} from "../src/features/design-studio/manifest";
import {
  readBlock,
  readExports,
  readRoot,
  readTheme,
  readTokens,
  readUses,
  readVariants,
  readWraps,
} from "../src/features/design-studio/source";

// Writes the Design Studio's list of this repo's components (docs/architecture/design-studio.md), so the hosted app
// never reads repo files at runtime. --write regenerates it; --check fails when it is out of date.
// When components move into @ken-os/ui (docs/architecture/ui-package.md), only the paths below change.

const mode = process.argv[2];
if (mode !== "--write" && mode !== "--check")
  throw new Error("Use --write to regenerate or --check to verify the studio manifest.");

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(webRoot, "src");
const read = (path: string) => readFileSync(resolve(src, path), "utf8").replace(/\r\n/g, "\n");

/** Loots wrappers: files of components built on the primitives. `library` is the first part of their ids. */
const wrapperFiles = [{ file: "components/engineering/kit.tsx", library: "kit" }];
/** Class-string surfaces, which render no primitive themselves, and the primitive each is a surface for. */
const surfaceFile = { file: "components/surfaces.ts", library: "surfaces", wraps: "ui/card" };

const globalsFile = "app/globals.css";
const globals = read(globalsFile);
const theme = readTheme(globals);
const names = theme.map((token) => token.name);
const globalsLines = globals.replace(/\n$/, "").split("\n");

const primitives: StudioComponent[] = readdirSync(resolve(src, "components/ui"))
  .filter((name) => name.endsWith(".tsx"))
  .sort()
  .map((name) => {
    const file = `components/ui/${name}`;
    const slug = name.replace(/\.tsx$/, "");
    const source = read(file);
    const exports = readExports(source);
    const root = readRoot(source, exports[0] ?? "");
    return {
      id: `ui/${slug}`,
      name: pascal(slug),
      kind: "primitive",
      file,
      exports,
      variants: readVariants(source),
      uses: readUses(source)
        .filter((used) => used !== slug)
        .map((used) => `ui/${used}`),
      tokens: readTokens(source, names),
      ...(root ? { slot: root.slot } : {}),
      ...(root?.variant ? { scoped: true as const } : {}),
    };
  });
/** A primitive's tokens, with those of the primitives it renders, since a token change reaches it through them. */
const reach = (id: string, seen = new Set<string>()): string[] => {
  const primitive = primitives.find((item) => item.id === id);
  if (!primitive || seen.has(id)) return [];
  seen.add(id);
  return [...primitive.tokens, ...primitive.uses.flatMap((used) => reach(used, seen))];
};
const tokensOf = new Map(
  primitives.map((primitive) => {
    const all = new Set(reach(primitive.id));
    return [primitive.id, names.filter((name) => all.has(name))];
  }),
);
for (const primitive of primitives) primitive.tokens = tokensOf.get(primitive.id) ?? [];
/** A wrapper's tokens: its own classes', and those of the primitive it is built on. */
const withBase = (own: string[], wraps?: string) =>
  names.filter((name) => own.includes(name) || (wraps ? tokensOf.get(wraps)?.includes(name) : false));

const wrappers: StudioComponent[] = wrapperFiles.flatMap(({ file, library }) => {
  const source = read(file);
  const wraps = readWraps(source);
  const local = new Set([...source.matchAll(/^export function ([A-Z]\w*)/gm)].map((match) => match[1]));
  return readExports(source)
    .filter((name) => local.has(name))
    .map((name) => {
      const block = readBlock(source, name);
      const base = wraps[name] ? `ui/${wraps[name]}` : undefined;
      return {
        id: `${library}/${kebab(name)}`,
        name,
        kind: "wrapper" as const,
        file,
        exports: [name],
        variants: [],
        uses: [],
        ...(base ? { wraps: base } : {}),
        tokens: withBase(readTokens(block?.lines.join("\n") ?? "", names), base),
        ...(block ? { source: block } : {}),
      };
    });
});

const surfaceSource = read(surfaceFile.file);
const surfaces: StudioComponent[] = readExports(surfaceSource).map((name) => ({
  id: `${surfaceFile.library}/${kebab(name)}`,
  name,
  kind: "wrapper",
  file: surfaceFile.file,
  exports: [name],
  variants: [],
  uses: [],
  wraps: surfaceFile.wraps,
  tokens: readTokens(new RegExp(`export const ${name} = ("[^"]*")`).exec(surfaceSource)?.[1] ?? "", names),
}));

const config = JSON.parse(read("../components.json")) as { style: string };
/** Other libraries come from the snapshot studio:registries commits, so this script never goes to the network. */
const snapshot = JSON.parse(read("features/design-studio/registries.snapshot.json")) as RegistrySnapshot;
const installed = new Set(primitives.map((primitive) => primitive.id));
const manifest: StudioManifest = {
  style: config.style,
  components: [...primitives, ...wrappers, ...surfaces],
  libraries: snapshot.libraries.map((library) => ({
    id: library.id,
    name: library.name,
    ...(library.folded ? { folded: true as const } : {}),
    items: libraryItems(library, installed),
  })),
  theme,
  globals: {
    file: globalsFile,
    lines: globalsLines.length,
    tail: globalsLines.slice(-3),
    newline: globals.endsWith("\n"),
  },
};

const path = resolve(src, "features/design-studio/manifest.generated.ts");
const content = `// Generated by scripts/generate-studio-manifest.ts. Do not edit; run pnpm --filter @ken-os/web studio:generate.
import type { StudioManifest } from "./manifest";

export const studioManifest: StudioManifest = ${JSON.stringify(manifest, null, 2)};
`;

if (mode === "--write") {
  writeFileSync(path, content, "utf8");
  console.log(
    `Studio manifest generated: ${manifest.components.length} components, ${manifest.libraries.map((library) => `${library.items.length} in ${library.name}`).join(", ")}.`,
  );
} else {
  let actual = "";
  try {
    actual = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  } catch {
    /* missing output */
  }
  if (actual !== content) {
    console.error(`The studio manifest is stale: ${path}. Run pnpm --filter @ken-os/web studio:generate.`);
    process.exitCode = 1;
  } else console.log("Studio manifest is current.");
}
