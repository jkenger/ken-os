"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, BookMarked, ClipboardCheck, UserRound, BookOpenText, FileText, FlaskConical, Image, Library, Lightbulb, ListTree, Menu, PanelLeftClose, PanelLeftOpen, Palette, PenLine, Search, Sparkles, Sun, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { TermLookup } from "@/components/terms/term-lookup";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Module = "resume" | "skills" | "memory" | "design" | "lab" | "writing" | "terms";

const modules = [
  { id: "resume" as const, label: "Resume", href: "/", icon: FileText },
  { id: "skills" as const, label: "Skills", href: "/skills", icon: Sparkles },
  { id: "design" as const, label: "Design System", href: "/design-system", icon: Palette },
  { id: "memory" as const, label: "Project Memory", href: "/memory", icon: BookOpenText },
  { id: "lab" as const, label: "Engineering Lab", href: "/lab", icon: FlaskConical },
  { id: "terms" as const, label: "Terms", href: "/terms", icon: BookMarked },
];
const previewModules = [
  ...modules.map((module) => module.id === "design" ? { ...module, href: "/design-preview?view=design" } : module.id === "memory" ? { ...module, href: "/design-preview?view=memory" } : module),
  { id: "writing" as const, label: "Writing Studio", href: "/design-preview?view=writing", icon: PenLine },
];

const moduleDetails: Record<Module, {
  title: string;
  sections: { label: string; href: string; icon: typeof FileText }[];
}> = {
  resume: {
    title: "Resume",
    sections: [
      { label: "Overview", href: "/", icon: Library },
      { label: "How it works", href: "/#how-it-works", icon: FileText },
      { label: "Resume assistant", href: "/#resume-assistant", icon: Sparkles },
    ],
  },
  skills: {
    title: "Skills",
    sections: [{ label: "Library", href: "/skills", icon: Library }],
  },
  memory: {
    title: "Project Memory",
    sections: [
      { label: "Handoff", href: "/memory", icon: BookOpenText },
      { label: "Decisions", href: "/memory#decisions", icon: Library },
      { label: "Work logs", href: "/memory#receipts", icon: FileText },
      { label: "Capture", href: "/memory#capture", icon: Sparkles },
      { label: "Policy", href: "/memory#policy", icon: FileText },
    ],
  },
  lab: {
    title: "Engineering Lab",
    sections: [
      { label: "Today", href: "/lab", icon: Sun },
      { label: "Course", href: "/lab/topics", icon: ListTree },
      { label: "Profile", href: "/lab/profile", icon: UserRound },
      { label: "Assessment", href: "/lab/assessment", icon: ClipboardCheck },
    ],
  },
  design: {
    title: "Design System",
    sections: [
      { label: "Overview", href: "/design-system", icon: Palette },
      { label: "Foundations", href: "/design-system#foundations", icon: Library },
      { label: "Components", href: "/design-system#components", icon: FileText },
      { label: "Patterns", href: "/design-system#patterns", icon: BookOpenText },
      { label: "Decisions", href: "/design-system#decisions", icon: Library },
      { label: "Export", href: "/design-system#export", icon: FileText },
    ],
  },
  writing: { title: "Writing Studio", sections: [] },
  terms: { title: "Terms", sections: [{ label: "Terms", href: "/terms", icon: BookMarked }] },
};

const writingPreviewGroups = [
  { title: "Create", items: [
    { label: "New post", icon: FileText },
    { label: "Templates", icon: Library },
    { label: "Snippets", icon: PenLine },
    { label: "Media", icon: Image },
  ] },
  { title: "Library", items: [
    { label: "All posts", icon: FileText },
    { label: "Drafts", icon: FileText },
    { label: "Published", icon: FileText },
    { label: "Ideas", icon: Lightbulb },
    { label: "Archive", icon: Archive },
  ] },
];

const previewMemorySections = [
  { label: "Handoff", href: "/design-preview?view=memory", icon: BookOpenText },
  { label: "Decisions", href: "/design-preview?view=memory#decisions", icon: Library },
  { label: "Open questions", href: "/design-preview?view=memory#open-questions", icon: FileText },
];

const sidebarLabel = "mb-2 px-3 text-[10px] font-bold tracking-[0.14em] text-muted-foreground";
const sidebarLink = "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors hover:bg-muted hover:text-foreground";

function ModuleSearch({ preview }: { preview: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const matches = (preview ? previewModules : modules).filter((item) => item.label.toLowerCase().includes(query.toLowerCase().trim()));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);

  const trapSearchFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('input, a, button:not([disabled])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <div>
      <button ref={triggerRef} className="flex h-9 w-9 items-center justify-center gap-2 rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted sm:w-60 sm:justify-start sm:px-3 lg:w-72" type="button" onClick={() => setOpen(true)} aria-label="Jump to a module">
        <Search size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="hidden flex-1 text-left text-xs sm:block">Jump to a module…</span>
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:block">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-center bg-foreground/40 px-4 pt-[min(17vh,150px)]" onMouseDown={() => setOpen(false)}>
          <div ref={dialogRef} className="h-fit w-full max-w-[480px] rounded-xl border border-border bg-popover p-2 shadow-2xl" role="dialog" aria-modal="true" aria-label="Jump to a module" onMouseDown={(event) => event.stopPropagation()} onKeyDown={trapSearchFocus}>
            <div className="flex items-center gap-2 border-b border-border px-2 pb-2 text-muted-foreground">
              <Search size={18} strokeWidth={1.8} aria-hidden="true" />
              <input
                ref={inputRef}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Search modules"
                placeholder="Find a module…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && matches[0]) {
                    setOpen(false);
                    setQuery("");
                    router.push(matches[0].href);
                  }
                }}
              />
              <button className="rounded-md p-1 hover:bg-muted" type="button" aria-label="Close search" onClick={() => setOpen(false)}><X size={17} /></button>
            </div>
            <p className="px-3 pb-1 pt-4 text-[10px] font-bold tracking-[0.14em] text-muted-foreground">MODULES</p>
            {matches.length > 0 ? matches.map(({ id, label, href, icon: Icon }) => (
              <Link key={id} className="flex h-10 items-center gap-3 rounded-md px-3 text-sm hover:bg-accent focus-visible:bg-accent" href={href} onClick={() => { setOpen(false); setQuery(""); }}>
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" /> {label}
              </Link>
            )) : <p className="px-3 py-3 text-sm text-muted-foreground">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkspaceShell({ email, active, children, preview = false, headerActions, onPreviewAction, termLookup = true }: { email: string; active: Module; children: ReactNode; preview?: boolean; headerActions?: ReactNode; onPreviewAction?: (label: string) => void; termLookup?: boolean }) {
  const detail = moduleDetails[active];
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const writingPreview = preview && active === "writing";
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      sidebarToggleRef.current?.focus();
    };
  }, [mobileOpen]);

  const trapSidebarFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!mobileOpen || event.key !== "Tab") return;
    const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>('a, button:not([disabled])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className={cn("h-[60px] border-b border-sidebar-border md:sticky md:top-0 md:h-screen md:shrink-0 md:border-b-0 md:border-r", writingPreview && desktopCollapsed ? "md:w-[64px]" : "md:w-[264px] xl:w-[276px]")} aria-label="Workspace sidebar">
        {mobileOpen && <button className="fixed inset-0 z-40 bg-foreground/50 md:hidden" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
        <div
          ref={sidebarRef}
          className={cn(
            "flex flex-col bg-sidebar text-sidebar-foreground md:h-screen",
            mobileOpen ? "fixed inset-y-3 left-3 z-50 w-[min(308px,calc(100vw-24px))] rounded-xl border border-sidebar-border shadow-2xl md:static md:w-auto md:rounded-none md:border-0 md:shadow-none" : "h-[60px] md:h-screen",
          )}
          role={mobileOpen ? "dialog" : undefined}
          aria-modal={mobileOpen ? "true" : undefined}
          aria-label={mobileOpen ? "Navigation menu" : undefined}
          onKeyDown={trapSidebarFocus}
        >
          <div className={cn("flex h-[60px] shrink-0 items-center justify-between px-4 md:h-16 md:border-b md:border-sidebar-border", mobileOpen && "border-b border-sidebar-border", writingPreview && desktopCollapsed && "md:justify-center md:px-2")}>
            <Link className="flex items-center gap-2.5 font-display text-xl font-bold tracking-[-0.055em]" href="/" aria-label="Ken OS home" onClick={() => setMobileOpen(false)}>
              <span className="grid size-9 place-items-center rounded-lg bg-primary text-xl text-primary-foreground">K</span>
              <span className={cn(writingPreview && desktopCollapsed && "md:hidden")}>ken<span className="text-muted-foreground">.os</span></span>
            </Link>
            <Button className={cn("md:hidden", writingPreview && "hidden")} ref={sidebarToggleRef} variant="outline" type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="workspace-sidebar-content" onClick={() => setMobileOpen((value) => !value)}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />} Menu
            </Button>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-6", mobileOpen ? "block" : "hidden md:block", writingPreview && desktopCollapsed && "md:px-2")} id="workspace-sidebar-content">
            <div>
              <p className={cn(sidebarLabel, writingPreview && desktopCollapsed && "md:sr-only")}>WORKSPACE</p>
              <nav className="grid gap-1" aria-label="Modules">
                {(preview ? previewModules : modules).map(({ id, label, href, icon: Icon }) => (
                  <Link key={id} className={cn(sidebarLink, active === id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground", writingPreview && desktopCollapsed && "md:justify-center md:px-2")} href={href} aria-label={writingPreview && desktopCollapsed ? label : undefined} title={writingPreview && desktopCollapsed ? label : undefined} aria-current={active === id ? "page" : undefined} onClick={() => setMobileOpen(false)}>
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span className={cn(writingPreview && desktopCollapsed && "md:sr-only")}>{label}</span>
                  </Link>
                ))}
              </nav>
            </div>
            {writingPreview ? writingPreviewGroups.map((group) => (
              <div className={cn("mt-7", desktopCollapsed && "md:hidden")} key={group.title}>
                <p className={sidebarLabel}>{group.title.toUpperCase()}</p>
                <nav className="grid gap-1" aria-label={`${group.title} preview actions`}>
                  {group.items.map(({ label, icon: Icon }) => <button className={cn(sidebarLink, "w-full text-left text-muted-foreground")} key={label} type="button" onClick={() => { onPreviewAction?.(label); setMobileOpen(false); }}><Icon size={17} strokeWidth={1.8} aria-hidden="true" />{label}</button>)}
                </nav>
              </div>
            )) : <div className="mt-7">
              <p className={sidebarLabel}>{detail.title.toUpperCase()}</p>
              <nav className="grid gap-1" aria-label={`${detail.title} sections`}>
                {(preview && active === "memory" ? previewMemorySections : detail.sections).map(({ label, href: originalHref, icon: Icon }, index) => {
                  const href = preview && active === "memory" ? originalHref.replace("/memory", "/design-preview?view=memory") : originalHref;
                  const resolvedHref = preview && active === "design" ? href.replace("/design-system", "/design-preview?view=design") : href;
                  const selected = preview && (active === "memory" || active === "design")
                    ? (index === 0 ? !hash : resolvedHref.endsWith(hash) && Boolean(hash))
                    : resolvedHref === pathname + hash || (index === 0 && ((pathname === resolvedHref && !hash) || preview));
                  return <Link key={href} className={cn(sidebarLink, selected ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground")} href={resolvedHref} aria-current={selected ? "location" : undefined} onClick={() => setMobileOpen(false)}><Icon size={17} strokeWidth={1.8} aria-hidden="true" />{label}</Link>;
                })}
              </nav>
            </div>}
          </div>
          <div className={cn("items-center gap-2.5 border-t border-sidebar-border px-4 py-3", mobileOpen ? "flex" : "hidden md:flex", writingPreview && desktopCollapsed && "md:justify-center md:px-2")} title={email}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">{email[0]?.toUpperCase()}</span>
            <span className={cn("min-w-0", writingPreview && desktopCollapsed && "md:hidden")}><small className="block truncate text-xs text-muted-foreground">{email}</small></span>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="min-h-[calc(100vh-60px)] bg-background md:min-h-screen">
          <header className={cn("flex h-16 items-center justify-between gap-4 border-b border-border px-5 sm:px-8", writingPreview && "sm:px-5")}>
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              {writingPreview && <><button className="grid size-9 shrink-0 place-items-center rounded-lg border border-border hover:bg-muted md:hidden" type="button" aria-label="Open sidebar" aria-controls="workspace-sidebar-content" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={17} /></button><button className="hidden size-9 shrink-0 place-items-center rounded-lg border border-border hover:bg-muted md:grid" type="button" aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-controls="workspace-sidebar-content" aria-expanded={!desktopCollapsed} onClick={() => setDesktopCollapsed((value) => !value)}>{desktopCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></>}
              <span className="truncate"><span className="hidden text-muted-foreground sm:inline">Ken OS <span className="px-2 text-border">/</span></span>{detail.title}{writingPreview && <><span className="px-2 text-border">/</span>Draft</>}</span>
            </div>
            {writingPreview ? headerActions : <div className="flex items-center gap-3"><ModuleSearch preview={preview} /><form action="/api/auth/signout" method="post"><Button variant="ghost" type="submit" className="text-xs">Sign out</Button></form></div>}
          </header>
          <main className="min-w-0" id="main-content">{termLookup ? <TermLookup module={detail.title}>{children}</TermLookup> : children}</main>
          <Toaster />
        </div>
      </div>
    </div>
  );
}
