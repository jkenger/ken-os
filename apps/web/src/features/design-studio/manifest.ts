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
  /** For a wrapper: the id of the primitive it is built on, when it is built on exactly one. */
  wraps?: string;
};

export type StudioManifest = {
  /** The shadcn style in components.json, such as "radix-luma". */
  style: string;
  components: StudioComponent[];
};

/** "dropdown-menu" -> "DropdownMenu". */
export function pascal(slug: string) {
  return slug.replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());
}

/** "SectionTitle" -> "section-title", "selectedRow" -> "selected-row". */
export function kebab(name: string) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
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

/** Rows whose name matches the query, keeping a wrapper's parent so the nesting still reads. */
export function filterTree(rows: ReturnType<typeof treeOrder>, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  const matches = (row: (typeof rows)[number]) => row.component.name.toLowerCase().includes(needle);
  return rows.filter(
    (row) =>
      matches(row) ||
      (row.depth === 0 &&
        rows.some((child) => child.depth === 1 && child.component.wraps === row.component.id && matches(child))),
  );
}
