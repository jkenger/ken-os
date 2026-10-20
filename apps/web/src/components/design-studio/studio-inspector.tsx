"use client";

import { useEffect, useLayoutEffect, useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { Check, CircleAlert, Eye, Layers, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  canRestyle,
  isTokenValue,
  radiusScale,
  rootSlot,
  shortValue,
  wrapperVariant,
  type Draft,
  type LookChange,
  type LookProp,
  type TokenChange,
} from "@/features/design-studio/drafts";
import type { StudioComponent, StudioManifest, ThemeToken } from "@/features/design-studio/manifest";
import { cn } from "@/lib/utils";
import { previewProps, type PreviewProps } from "./previews";
import type { SaveStatus } from "./use-drafts";

// The studio's inspector (docs/architecture/design-studio.md, step 3; mockup frames D1 to D6 and D8): the picked
// component's facts, then Preview (changes the live sample only), Look (restyles it, saved as a Loots wrapper) and
// Tokens (the theme tokens it uses). With nothing picked it is the Theme: every Loots and shadcn token in groups.

/** The Theme's groups (D1). Tokens not named here, such as the sidebar and chart ones, show only in a component's
 *  Tokens tab when it uses them. */
const themeGroups: { title: string; tokens: string[] }[] = [
  { title: "Shape", tokens: ["radius"] },
  { title: "Surfaces", tokens: ["background", "card", "popover", "primary", "secondary", "muted"] },
  {
    title: "Text and borders",
    tokens: ["foreground", "muted-foreground", "primary-foreground", "border", "input", "ring"],
  },
  { title: "Selection", tokens: ["selected"] },
  { title: "Status", tokens: ["topic-learned", "topic-active", "destructive"] },
  { title: "Chapters", tokens: ["chapter-1", "chapter-2", "chapter-3", "chapter-4", "chapter-5", "chapter-6"] },
];

/** The 7px draft mark, with "Changed" as its name (B3). */
export function ChangedDot({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      role="img"
      aria-label="Changed"
      className={cn("inline-block size-1.75 shrink-0 rounded-full bg-primary", className)}
      {...props}
    />
  );
}

/** The header facts (D2, D6): the library, what a wrapper wraps as a link, and the file. */
export function InspectorFacts({ component, manifest }: { component?: StudioComponent; manifest: StudioManifest }) {
  if (!component)
    return (
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">File</dt>
        <dd className="font-mono break-all">apps/web/src/{manifest.globals.file}</dd>
      </dl>
    );
  const base = component.wraps && manifest.components.find((item) => item.id === component.wraps);
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-1.5 text-xs">
      <dt className="text-muted-foreground">Library</dt>
      <dd className="font-semibold">This repo</dd>
      {base && (
        <>
          <dt className="text-muted-foreground">Wraps</dt>
          <dd>
            <Link
              href={`/studio?c=${encodeURIComponent(base.id)}`}
              scroll={false}
              className="font-semibold underline underline-offset-4"
            >
              {base.name}
            </Link>
          </dd>
        </>
      )}
      <dt className="text-muted-foreground">File</dt>
      <dd className="font-mono break-all">apps/web/src/{component.file}</dd>
    </dl>
  );
}

/** The line at the top of a tab that names where its edits go (D2, D3, D6). */
function Where({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs [&_svg]:size-3.5 [&_svg]:shrink-0">
      {icon}
      {children}
    </p>
  );
}

function ControlLabel({
  id,
  htmlFor,
  name,
  prop,
  changed,
}: {
  id?: string;
  htmlFor?: string;
  name: string;
  prop?: string;
  changed?: boolean;
}) {
  const inner = (
    <>
      {name}
      {prop && <span className="font-mono text-xs font-normal text-muted-foreground">{prop}</span>}
      {changed && <ChangedDot className="ml-0.5" />}
    </>
  );
  if (htmlFor)
    return (
      <Label htmlFor={htmlFor} className="gap-1.5">
        {inner}
      </Label>
    );
  return (
    <span id={id} className="flex items-center gap-1.5 text-sm leading-none font-medium">
      {inner}
    </span>
  );
}

/** A text field that keeps what the owner is typing, and reports it once it is a value worth keeping. */
function DraftInput({
  value,
  onCommit,
  valid,
  render,
}: {
  value: string;
  onCommit: (value: string) => void;
  valid: (value: string) => boolean;
  render: (props: { value: string; onChange: (event: { target: { value: string } }) => void }) => ReactNode;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return render({
    value: text,
    onChange: (event) => {
      setText(event.target.value);
      const next = event.target.value.trim();
      if (next && valid(next)) onCommit(next);
    },
  });
}

/** One option of a variant group, spaced and wrapping, since a joined group doesn't fit 384px (D2). */
function Options({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={1.5}
      value={value}
      onValueChange={(next) => next && onChange(next)}
      aria-labelledby={label}
      className="flex-wrap"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option} value={option}>
          {option}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Preview (D2): controls from the sample's variants and props. They change the preview only, never a draft. */
function PreviewTab({
  component,
  values,
  onChange,
}: {
  component: StudioComponent;
  values: PreviewProps;
  onChange: (values: PreviewProps) => void;
}) {
  const defaults = previewProps[component.id];
  if (!defaults)
    return (
      <div className="grid gap-4">
        <Where icon={<Eye aria-hidden="true" />}>Preview only</Where>
        <p className="text-sm text-muted-foreground">Nothing to change</p>
      </div>
    );
  const set = (key: string, value: string | boolean) => onChange({ ...values, [key]: value });
  const labels: Record<string, string> = { children: "Label", disabled: "Disabled", placeholder: "Placeholder" };
  return (
    <div className="grid gap-4.5">
      <Where icon={<Eye aria-hidden="true" />}>Preview only</Where>
      {Object.entries(defaults).map(([key, fallback]) => {
        const value = values[key] ?? fallback;
        const group = component.variants.find((item) => item.name === key);
        const id = `pv-${component.id}-${key}`;
        if (group)
          return (
            <div key={key} className="grid gap-2">
              <ControlLabel id={id} name={key.charAt(0).toUpperCase() + key.slice(1)} prop={key} />
              <Options label={id} options={group.options} value={String(value)} onChange={(next) => set(key, next)} />
            </div>
          );
        if (typeof fallback === "boolean")
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <ControlLabel htmlFor={id} name={labels[key] ?? key} prop={key} />
              <Switch id={id} checked={value === true} onCheckedChange={(next) => set(key, next)} />
            </div>
          );
        return (
          <div key={key} className="grid gap-2">
            <ControlLabel htmlFor={id} name={labels[key] ?? key} prop={key} />
            <Input id={id} value={String(value)} onChange={(event) => set(key, event.target.value)} />
          </div>
        );
      })}
    </div>
  );
}

/** What the live preview shows today for each Look part, read off the rendered element, and its `--radius` in px. */
type Measured = Partial<Record<LookProp, string>> & { base?: number };

function measure(component: StudioComponent, components: StudioComponent[]): Measured {
  const slot = rootSlot(component, components);
  const element = document.querySelector<HTMLElement>(`[data-studio-preview="${component.id}"] [data-slot="${slot}"]`);
  if (!element) return {};
  const style = getComputedStyle(element);
  const px = (value: string) => (value.endsWith("px") ? String(Math.round(parseFloat(value))) : "");
  const base =
    parseFloat(style.getPropertyValue("--radius")) * parseFloat(getComputedStyle(document.documentElement).fontSize);
  const corner = parseFloat(style.borderTopLeftRadius);
  let radius = "";
  if (corner === 0) radius = "none";
  else if (corner > 1000) radius = "full";
  else for (const [name, step] of Object.entries(radiusScale)) if (Math.abs(base * step - corner) < 0.6) radius = name;
  return {
    base,
    radius,
    height: px(style.height),
    padding: px(style.paddingLeft),
    gap: style.gap === "normal" ? "" : px(style.gap),
    weight: style.fontWeight,
  };
}

/** Look (D3, D6): the parts of the component that can be restyled, each a control that makes a draft. */
function LookTab({
  component,
  components,
  theme,
  change,
  onChange,
}: {
  component: StudioComponent;
  components: StudioComponent[];
  theme: ThemeToken[];
  change: LookChange;
  onChange: (change: LookChange) => void;
}) {
  const [measured, setMeasured] = useState<Measured>({});
  const wrapper = component.kind === "wrapper";
  // Read after each render, so the values follow the preview; parts with a draft keep their recorded `from`.
  useLayoutEffect(() => {
    const next = measure(component, components);
    setMeasured((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
  });
  if (!canRestyle(component, components))
    return (
      <div className="grid gap-4">
        <Where icon={<Layers aria-hidden="true" />}>
          {wrapper ? "Saved to this wrapper" : "Saved as a Loots wrapper"}
        </Where>
        <p className="text-sm text-muted-foreground">Nothing to restyle</p>
      </div>
    );

  const original = (key: LookProp) =>
    change.from?.[key] ?? (key === "variant" ? wrapperVariant(component) : measured[key]) ?? "";
  const value = (key: LookProp) => change[key] ?? original(key);
  /** Sets one part; back to where it started removes it from the draft. */
  const set = (key: LookProp, next: string) => {
    const from = { ...change.from };
    const updated: LookChange = { ...change, from };
    if (!next || next === original(key)) {
      delete updated[key];
      delete from[key];
    } else {
      updated[key] = next;
      from[key] = original(key);
    }
    onChange(updated);
  };

  const base = components.find((item) => item.id === component.wraps);
  const variants = (wrapper ? base : component)?.variants.find((group) => group.name === "variant");
  const current = wrapperVariant(component);
  // The scale follows a radius token draft, as the preview does; 10px is globals.css's 0.625rem.
  const radiusPx = (name: string) => Math.round((measured.base || 10) * (radiusScale[name] ?? 0));
  const colours = theme.filter((token) => token.name !== "radius" && !token.name.endsWith("-soft"));
  const px = (key: "height" | "padding" | "gap", label: string) => {
    const id = `lk-${key}`;
    return (
      <div className="grid gap-2">
        <ControlLabel htmlFor={id} name={label} changed={Boolean(change[key])} />
        <DraftInput
          value={value(key)}
          valid={(next) => /^\d{1,3}$/.test(next)}
          onCommit={(next) => set(key, next)}
          render={(props) => (
            <InputGroup className="h-8">
              <InputGroupInput id={id} inputMode="numeric" {...props} />
              <InputGroupAddon align="inline-end">
                <InputGroupText>px</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          )}
        />
      </div>
    );
  };
  const colour = (key: "background" | "text" | "border", label: string) => {
    const id = `lk-${key}`;
    const picked = change[key] ?? "";
    return (
      <div className="flex items-center justify-between gap-3">
        <ControlLabel htmlFor={id} name={label} changed={Boolean(picked)} />
        <span className="flex w-52 items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_18%,transparent)]"
            style={{ background: picked && picked !== "transparent" ? `var(--${picked})` : "transparent" }}
          />
          <NativeSelect
            id={id}
            size="sm"
            className="w-full font-mono text-xs"
            value={picked}
            onChange={(event) => set(key, event.target.value)}
          >
            <NativeSelectOption value="">Default</NativeSelectOption>
            {key !== "text" && <NativeSelectOption value="transparent">transparent</NativeSelectOption>}
            {colours.map((token) => (
              <NativeSelectOption key={token.name} value={token.name}>
                {token.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </span>
      </div>
    );
  };

  return (
    <div className="grid gap-4.5">
      <Where icon={<Layers aria-hidden="true" />}>
        {wrapper ? "Saved to this wrapper" : "Saved as a Loots wrapper"}
      </Where>
      {wrapper && variants && current && (
        <div className="grid gap-2">
          <ControlLabel id="lk-variant" name="Variant" changed={Boolean(change.variant)} />
          <Options
            label="lk-variant"
            options={variants.options}
            value={value("variant")}
            onChange={(next) => set("variant", next)}
          />
        </div>
      )}
      {!wrapper && variants && (
        <div className="grid gap-2">
          <ControlLabel htmlFor="lk-scope" name="Variant" />
          <NativeSelect
            id="lk-scope"
            size="sm"
            className="w-full"
            value={change.scope ?? ""}
            onChange={(event) => onChange({ ...change, scope: event.target.value || undefined })}
          >
            <NativeSelectOption value="">All variants</NativeSelectOption>
            {variants.options.map((option) => (
              <NativeSelectOption key={option} value={option}>
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <ControlLabel htmlFor="lk-radius" name="Radius" changed={Boolean(change.radius)} />
          <NativeSelect
            id="lk-radius"
            size="sm"
            className="w-full"
            value={value("radius")}
            onChange={(event) => set("radius", event.target.value)}
          >
            {!value("radius") && <NativeSelectOption value="">Default</NativeSelectOption>}
            <NativeSelectOption value="none">none · 0px</NativeSelectOption>
            {Object.keys(radiusScale).map((name) => (
              <NativeSelectOption key={name} value={name}>
                {name} · {radiusPx(name)}px
              </NativeSelectOption>
            ))}
            <NativeSelectOption value="full">full</NativeSelectOption>
          </NativeSelect>
        </div>
        {px("height", "Height")}
        {px("padding", "Padding")}
        {px("gap", "Gap")}
      </div>
      <div className="grid gap-2">
        <ControlLabel id="lk-weight" name="Font weight" changed={Boolean(change.weight)} />
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={value("weight")}
          onValueChange={(next) => next && set("weight", next)}
          aria-labelledby="lk-weight"
        >
          {["400", "500", "600", "700"].map((weight) => (
            <ToggleGroupItem key={weight} value={weight}>
              {weight}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">Colours</span>
        {colour("background", "Background")}
        {colour("text", "Text")}
        {colour("border", "Border")}
      </div>
    </div>
  );
}

/** Token rows (D1, D4): radius as one value, every colour as its Light and Dark values side by side. */
function TokenRows({
  groups,
  theme,
  drafts,
  reach,
  onChange,
}: {
  groups: { title?: string; tokens: string[] }[];
  theme: ThemeToken[];
  drafts: Draft[];
  /** "Used by N components", in a component's Tokens tab. */
  reach?: (token: string) => number;
  onChange: (token: string, change: TokenChange) => void;
}) {
  const byName = new Map(theme.map((token) => [token.name, token]));
  const changeOf = (name: string) =>
    (drafts.find((draft) => draft.kind === "token" && draft.target === name)?.change as TokenChange | undefined) ?? {};
  /** Back to the value in globals.css drops that side of the draft. */
  const set = (token: ThemeToken, side: "light" | "dark", typed: string) => {
    const before = token[side] ?? token.light;
    const value = before.startsWith("oklch(") && /^[\d.\s/%]+$/.test(typed) ? `oklch(${typed})` : typed;
    const change = { ...changeOf(token.name) };
    if (value === before) delete change[side];
    else change[side] = value;
    onChange(token.name, change);
  };
  const field = (token: ThemeToken, side: "light" | "dark") => {
    const shown = changeOf(token.name)[side] ?? token[side] ?? token.light;
    return (
      <DraftInput
        value={shortValue(shown)}
        valid={isTokenValue}
        onCommit={(next) => set(token, side, next)}
        render={(props) => (
          <InputGroup className="h-8">
            {/* A colour gets a swatch; radius, the one token with no dark value, is a length. */}
            {token.dark !== undefined && (
              <InputGroupAddon className="pr-0">
                <span
                  aria-hidden="true"
                  className="size-3.5 rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_18%,transparent)]"
                  style={{ background: shown }}
                />
              </InputGroupAddon>
            )}
            <InputGroupInput
              aria-label={`${token.name}, ${side}`}
              className="pr-2 pl-1.5 font-mono text-xs md:text-xs"
              {...props}
            />
          </InputGroup>
        )}
      />
    );
  };
  return (
    <div className="grid gap-4.5">
      <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground">
        <span>Light</span>
        <span>Dark</span>
      </div>
      {groups.map((group) => (
        <section key={group.title ?? "tokens"} aria-label={group.title} className="grid gap-3">
          {group.title && <h3 className="text-xs font-medium text-muted-foreground">{group.title}</h3>}
          {group.tokens.map((name) => {
            const token = byName.get(name);
            if (!token) return null;
            const changed = Boolean(changeOf(name).light || changeOf(name).dark);
            return (
              <div key={name} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2 font-mono text-xs">
                  <span className="flex items-center gap-1.5">
                    {name}
                    {changed && <ChangedDot />}
                  </span>
                  {reach && <span className="font-sans text-muted-foreground">Used by {reach(name)} components</span>}
                </div>
                {token.dark === undefined ? (
                  field(token, "light")
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {field(token, "light")}
                    {field(token, "dark")}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/** The sticky footer while editing (D5): save status on the left, Reset on the right. */
function Footer({
  status,
  saved,
  onRetry,
  onReset,
}: {
  status: SaveStatus;
  /** Whether this view has a draft, which reads "Draft saved" before any change in this visit. */
  saved: boolean;
  onRetry: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="sticky bottom-0 mt-auto flex min-h-13 items-center justify-between gap-2 border-t bg-card py-2 pr-3 pl-4">
      <span
        role={status === "failed" ? "alert" : "status"}
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          status === "failed" && "text-destructive",
        )}
      >
        {status === "saving" && (
          <>
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            Saving…
          </>
        )}
        {(status === "saved" || (status === "idle" && saved)) && (
          <>
            <Check className="size-3.5" aria-hidden="true" />
            Draft saved
          </>
        )}
        {status === "failed" && (
          <>
            <CircleAlert className="size-3.5" aria-hidden="true" />
            Couldn&apos;t save ·
            <Button
              variant="link"
              size="xs"
              className="h-auto p-0 text-xs font-semibold text-destructive"
              onClick={onRetry}
            >
              Retry
            </Button>
          </>
        )}
      </span>
      <Button variant="ghost" size="sm" disabled={!onReset} onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}

/** Reset's confirm (D8): the question, what it costs, and the verb. */
function ResetDialog({
  open,
  title,
  description,
  onOpenChange,
  onReset,
}: {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={() => {
              onReset();
              onOpenChange(false);
            }}
          >
            Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type InspectorProps = {
  component?: StudioComponent;
  manifest: StudioManifest;
  drafts: Draft[];
  status: SaveStatus;
  preview: PreviewProps;
  onPreview: (values: PreviewProps) => void;
  onDraft: (draft: Draft) => void;
  onDiscard: (keys: Pick<Draft, "kind" | "target">[]) => void;
  onRetry: () => void;
};

/** The inspector's body: the Theme with nothing picked, else the Preview, Look and Tokens tabs, each with its footer. */
export function InspectorBody({
  component,
  manifest,
  drafts,
  status,
  preview,
  onPreview,
  onDraft,
  onDiscard,
  onRetry,
}: InspectorProps) {
  const [tab, setTab] = useState("preview");
  const [confirm, setConfirm] = useState<{ title: string; keys: Pick<Draft, "kind" | "target">[] } | null>(null);
  const tokenDraft = (token: string, change: TokenChange) => onDraft({ kind: "token", target: token, change });
  const tokenKeys = (names: string[]) =>
    drafts
      .filter((draft) => draft.kind === "token" && names.includes(draft.target))
      .map(({ kind, target }) => ({ kind, target }));

  const resetDialog = (
    <ResetDialog
      open={Boolean(confirm)}
      title={confirm?.title ?? ""}
      description={confirm?.keys.length === 1 ? "Removes its draft" : "Removes their drafts"}
      onOpenChange={(open) => !open && setConfirm(null)}
      onReset={() => confirm && onDiscard(confirm.keys)}
    />
  );

  if (!component) {
    const keys = tokenKeys(manifest.theme.map((token) => token.name));
    return (
      <>
        <div className="p-4">
          <TokenRows groups={themeGroups} theme={manifest.theme} drafts={drafts} onChange={tokenDraft} />
        </div>
        <Footer
          status={status}
          saved={keys.length > 0}
          onRetry={onRetry}
          onReset={keys.length ? () => setConfirm({ title: "Reset Theme?", keys }) : undefined}
        />
        {resetDialog}
      </>
    );
  }

  const look = drafts.find((draft) => draft.kind === "component" && draft.target === component.id);
  const lookChange = (look?.change as LookChange | undefined) ?? {};
  const reach = (token: string) => manifest.components.filter((item) => item.tokens.includes(token)).length;
  // Radius first, as a single value above the colours (D4).
  const used = [...component.tokens].sort((a, b) => Number(b === "radius") - Number(a === "radius"));
  const usedKeys = tokenKeys(used);

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col gap-0">
      <div className="px-4 pt-3">
        <TabsList className="w-full">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="look">Look</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="preview" className="p-4">
        <PreviewTab component={component} values={preview} onChange={onPreview} />
      </TabsContent>
      <TabsContent value="look" className="flex flex-1 flex-col">
        <div className="p-4">
          <LookTab
            component={component}
            components={manifest.components}
            theme={manifest.theme}
            change={lookChange}
            onChange={(change) => onDraft({ kind: "component", target: component.id, change })}
          />
        </div>
        <Footer
          status={status}
          saved={Boolean(look)}
          onRetry={onRetry}
          onReset={
            look
              ? () =>
                  setConfirm({ title: `Reset ${component.name}?`, keys: [{ kind: "component", target: component.id }] })
              : undefined
          }
        />
      </TabsContent>
      <TabsContent value="tokens" className="flex flex-1 flex-col">
        <div className="p-4">
          {used.length ? (
            <TokenRows
              groups={[{ tokens: used }]}
              theme={manifest.theme}
              drafts={drafts}
              reach={reach}
              onChange={tokenDraft}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No tokens</p>
          )}
        </div>
        <Footer
          status={status}
          saved={usedKeys.length > 0}
          onRetry={onRetry}
          onReset={
            usedKeys.length ? () => setConfirm({ title: `Reset ${component.name} tokens?`, keys: usedKeys }) : undefined
          }
        />
      </TabsContent>
      {resetDialog}
    </Tabs>
  );
}
