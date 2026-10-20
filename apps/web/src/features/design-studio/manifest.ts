// The Design Studio's view of the components in this repo (docs/architecture/design-studio.md): the manifest's shape
// and the tree built from it. Reading the source is in source.ts, which only the manifest script uses.

/** A variant group from a cva() call: its name, its options in source order, and the default option if one is set. */
export type VariantGroup = { name: string; options: string[]; defaultOption?: string };

/** A primitive in components/ui, or a Loots wrapper built on top of one. */
export type StudioComponent = {
  /** `<library>/<slug>`, the value of `?c=` in the studio's address. */
  id: string;
  name: string;
  kind: "primitive" | "wrapper";
  /** Path from apps/web/src. */
  file: string;
  exports: string[];
  variants: VariantGroup[];
  /** Ids of the other primitives it is built from, its registry dependencies (Sidebar uses Sheet, Button, Input). */
  uses: string[];
  /** For a wrapper: the id of the primitive it is built on, when it is built on exactly one. */
  wraps?: string;
  /** The theme tokens its classes use (`radius` for any rounded class), for the inspector's Tokens tab. */
  tokens: string[];
  /** The `data-slot` of the element a primitive's first export passes its className to, which the studio's Look
   *  edits style in the live preview. Missing when that export styles nothing, as a Radix root doesn't. */
  slot?: string;
  /** Whether that export takes a `variant` prop, so a Look edit can be limited to one variant. */
  scoped?: true;
  /** A wrapper function's own lines and the line they start on, which a Look edit's patch changes in place. */
  source?: { start: number; lines: string[] };
};

/** A component another library offers, known from its registry JSON only: the studio never runs its code. */
export type LibraryItem = {
  /** `<library>/<registry name>`, the value of `?c=` in the studio's address. */
  id: string;
  name: string;
  /** The docs one-liner, when the library's docs have one. */
  description?: string;
  /** Ids of the components it uses: This repo's when installed here, else the library's own. */
  uses: string[];
  /** The id of this repo's primitive when it is installed here. */
  installed?: string;
  /** The command that adds it. */
  add: string;
  docs?: string;
};

/** A library other than this repo, such as shadcn/ui, as one branch of the tree. */
export type StudioLibrary = { id: string; name: string; items: LibraryItem[] };

/** What scripts/fetch-studio-registries.ts commits: each library's items as its registry names them. */
export type RegistrySnapshot = {
  libraries: {
    id: string;
    name: string;
    items: { name: string; description?: string; uses: string[]; docs?: string }[];
  }[];
};

/** A theme token from globals.css: its `:root` value and, when it has one, its `.dark` value. */
export type ThemeToken = { name: string; light: string; dark?: string };

export type StudioManifest = {
  /** The shadcn style in components.json, such as "radix-luma". */
  style: string;
  components: StudioComponent[];
  /** The other libraries, from the committed registry snapshot. */
  libraries: StudioLibrary[];
  /** Every token set in globals.css, with the Loots section's values over shadcn's. */
  theme: ThemeToken[];
  /** globals.css's length, last lines and whether it ends with a newline, so a token patch can append to its Loots
   *  section. */
  globals: { file: string; lines: number; tail: string[]; newline: boolean };
};

/** "dropdown-menu" -> "DropdownMenu". */
export function pascal(slug: string) {
  return slug.replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());
}

/** "SectionTitle" -> "section-title", "selectedRow" -> "selected-row". */
export function kebab(name: string) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** A library's items as the studio lists them: named in Pascal case, marked installed when this repo has a primitive
 *  of the same name, and using only the library's own components, pointed at this repo's where installed. */
export function libraryItems(
  library: RegistrySnapshot["libraries"][number],
  primitives: Set<string>,
): StudioLibrary["items"] {
  const names = new Set(library.items.map((item) => item.name));
  const local = (name: string) => (primitives.has(`ui/${name}`) ? `ui/${name}` : undefined);
  return library.items.map((item) => ({
    id: `${library.id}/${item.name}`,
    name: pascal(item.name),
    ...(item.description ? { description: item.description } : {}),
    uses: item.uses.filter((name) => names.has(name)).map((name) => local(name) ?? `${library.id}/${name}`),
    ...(local(item.name) ? { installed: local(item.name) } : {}),
    add: `pnpm dlx shadcn@latest add @${library.id}/${item.name}`,
    ...(item.docs ? { docs: item.docs } : {}),
  }));
}

/** The tree's order: primitives A to Z, each followed by the wrappers built on it, then wrappers that wrap nothing, A
 *  to Z among the primitives by name. */
export function treeOrder(components: StudioComponent[]) {
  const byName = (a: StudioComponent, b: StudioComponent) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.id.localeCompare(b.id);
  const children = new Map<string, StudioComponent[]>();
  const roots: StudioComponent[] = [];
  for (const component of components) {
    if (component.kind === "wrapper" && component.wraps && components.some((c) => c.id === component.wraps)) {
      children.set(component.wraps, [...(children.get(component.wraps) ?? []), component]);
    } else roots.push(component);
  }
  return roots
    .sort(byName)
    .flatMap((root) => [
      { component: root, depth: 0 },
      ...(children.get(root.id) ?? []).sort(byName).map((child) => ({ component: child, depth: 1 })),
    ]);
}

/** Rows whose name matches the query and, with `changed`, that have a draft, keeping a wrapper's parent so the nesting
 *  still reads. */
export function filterTree(rows: ReturnType<typeof treeOrder>, query: string, changed?: Set<string>) {
  const needle = query.trim().toLowerCase();
  if (!needle && !changed) return rows;
  const matches = (row: (typeof rows)[number]) =>
    row.component.name.toLowerCase().includes(needle) && (!changed || changed.has(row.component.id));
  return rows.filter(
    (row) =>
      matches(row) ||
      (row.depth === 0 &&
        rows.some((child) => child.depth === 1 && child.component.wraps === row.component.id && matches(child))),
  );
}

/** The canvas grid (mockup frame A1): five columns of 240 by 180 nodes inside This repo's area, in tree order. */
export const graphGrid = {
  columns: 5,
  width: 240,
  height: 180,
  columnGap: 48,
  rowGap: 56,
  left: 32,
  top: 64,
  bottom: 32,
};

/** An edge from a component to one it uses, or from a Loots wrapper to the primitive it wraps (drawn dashed), with its
 *  SVG path on the canvas. */
export type GraphEdge = { id: string; source: string; target: string; kind: "uses" | "wraps"; path: string };

type Box = { x: number; y: number };

/** An edge's path in right angles through the gaps between nodes, never across one (mockup frame A1): straight across
 *  to a neighbour in the same row; otherwise up out of the source's top into the gap above its row, along that gap to
 *  the column gap beside the source, along the column gap to the gap above the target's row, and down into the
 *  target's top. `start` and `end` spread the edges leaving or entering one node, and `lane` shifts the gap segments
 *  so edges sharing a gap run side by side. */
export function routeEdge(from: Box, to: Box, { start = 0, end = 0, lane = 0 } = {}) {
  const { width, height, columnGap, rowGap } = graphGrid;
  if (from.y === to.y && Math.abs(from.x - to.x) === width + columnGap) {
    const y = from.y + height / 2 + start;
    const [x1, x2] = from.x < to.x ? [from.x + width, to.x] : [from.x, to.x + width];
    return `M${x1} ${y} H${x2}`;
  }
  const x1 = from.x + width / 2 + start;
  const x2 = to.x + width / 2 + end;
  const above = (box: Box) => box.y - rowGap / 2 + lane;
  if (from.y === to.y) return `M${x1} ${from.y} V${above(from)} H${x2} V${to.y}`;
  const side = to.x < from.x ? from.x - columnGap / 2 : from.x + width + columnGap / 2;
  return `M${x1} ${from.y} V${above(from)} H${side + lane} V${above(to)} H${x2} V${to.y}`;
}

/** Where each component sits on the canvas, the size of the This repo area around them, and the dependency edges. */
export function layoutGraph(components: StudioComponent[]) {
  const { columns, width, height, columnGap, rowGap, left, top, bottom } = graphGrid;
  const ids = new Set(components.map((component) => component.id));
  const nodes = treeOrder(components).map(({ component }, index) => ({
    component,
    x: left + (index % columns) * (width + columnGap),
    y: top + Math.floor(index / columns) * (height + rowGap),
  }));
  const rows = Math.max(1, Math.ceil(nodes.length / columns));
  const links = components.flatMap((component) => [
    ...component.uses
      .filter((target) => ids.has(target))
      .map((target) => ({ id: `${component.id}>${target}`, source: component.id, target, kind: "uses" as const })),
    ...(component.wraps && ids.has(component.wraps)
      ? [
          {
            id: `${component.id}>${component.wraps}`,
            source: component.id,
            target: component.wraps,
            kind: "wraps" as const,
          },
        ]
      : []),
  ]);
  const at = new Map(nodes.map((node) => [node.component.id, node]));
  // Edges leaving one node start 10px apart and edges entering one end 20px apart, centred on the node.
  const spread = (ids: string[], id: string, step: number) => (ids.indexOf(id) - (ids.length - 1) / 2) * step;
  const out = (source: string) => links.filter((link) => link.source === source).map((link) => link.id);
  const into = (target: string) => links.filter((link) => link.target === target).map((link) => link.id);
  const edges: GraphEdge[] = links.map((link, index) => ({
    ...link,
    path: routeEdge(at.get(link.source)!, at.get(link.target)!, {
      start: spread(out(link.source), link.id, 10),
      end: spread(into(link.target), link.id, 20),
      lane: ((index % 5) - 2) * 4,
    }),
  }));
  return {
    nodes,
    edges,
    area: {
      width: left * 2 + columns * width + (columns - 1) * columnGap,
      height: top + rows * height + (rows - 1) * rowGap + bottom,
    },
  };
}
