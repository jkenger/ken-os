"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, BookMarked, UserRound, BookOpenText, FileText, FlaskConical, Image, LayoutDashboard, Library, Lightbulb, ListTree, Menu, PanelLeftClose, PanelLeftOpen, Palette, PenLine, Repeat, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { TermLookup } from "@/components/terms/term-lookup";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { engineering, tabForPath, type EngineeringTab } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";

type Module = "resume" | "skills" | "memory" | "design" | "lab" | "writing" | "terms";

const modules = [
  { id: "resume" as const, label: "Resume", href: "/", icon: FileText },
  { id: "skills" as const, label: "Skills", href: "/skills", icon: Sparkles },
  { id: "design" as const, label: "Design System", href: "/design-system", icon: Palette },
  { id: "memory" as const, label: "Project Memory", href: "/memory", icon: BookOpenText },
  { id: "lab" as const, label: "Engineering", href: engineering.overview, icon: FlaskConical },
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
    title: "Engineering",
    sections: [
      { label: "Overview", href: engineering.overview, icon: LayoutDashboard },
      { label: "Profile", href: engineering.profile, icon: UserRound },
      { label: "Learn", href: engineering.learn, icon: ListTree },
      { label: "Practice", href: engineering.practice, icon: Repeat },
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

/** Today in the owner's time zone, like "Tue, Oct 6, 2026". */
function ownerDate() {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());
}

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
      <button ref={triggerRef} className="flex h-9 w-9 items-center justify-center gap-2 rounded-full bg-card text-muted-foreground shadow-tab transition-colors hover:bg-accent sm:w-60 sm:justify-start sm:px-3.5 md:bg-muted md:shadow-none lg:w-72" type="button" onClick={() => setOpen(true)} aria-label="Jump to a module">
        <Search size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="hidden flex-1 text-left text-xs sm:block">Jump to a module…</span>
        <kbd className="hidden rounded-md bg-card px-1.5 py-0.5 text-[10px] text-quiet sm:block">Ctrl K</kbd>
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

export function WorkspaceShell({ email, active, children, preview = false, headerActions, onPreviewAction, termLookup = true, tab }: { email: string; active: Module; children: ReactNode; preview?: boolean; headerActions?: ReactNode; onPreviewAction?: (label: string) => void; termLookup?: boolean; tab?: EngineeringTab }) {
  const detail = moduleDetails[active];
  const pathname = usePathname();
  // Engineering's nested pages (a topic, the assessment, evidence) highlight one of its four sidebar sections.
  const engineeringTab = active === "lab" ? tab ?? tabForPath(pathname) : null;
  // Every module uses the Studio shell; only the Writing Studio mockup keeps its old rail.
  const studio = !(preview && active === "writing");
  const [hash, setHash] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
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

  const moduleList = preview ? previewModules : modules;
  const sections = (preview && active === "memory" ? previewMemorySections : detail.sections).map(({ label, href: originalHref, icon }, index) => {
    const href = preview && active === "memory" ? originalHref.replace("/memory", "/design-preview?view=memory") : originalHref;
    const resolvedHref = preview && active === "design" ? href.replace("/design-system", "/design-preview?view=design") : href;
    const selected = engineeringTab ? tabForPath(resolvedHref) === engineeringTab : preview && (active === "memory" || active === "design")
      ? (index === 0 ? !hash : resolvedHref.endsWith(hash) && Boolean(hash))
      : resolvedHref === pathname + hash || (index === 0 && ((pathname === resolvedHref && !hash) || preview));
    return { key: href, label, href: resolvedHref, icon, selected };
  });
  const currentSection = sections.find((section) => section.selected);

  if (studio) {
    // The Studio shell (design system 0.4): a module icon strip, the current module's section column and the page,
    // all on one flat ground. Only the current items and the page's panels are raised.
    const tile = "grid size-10 place-items-center rounded-lg text-sidebar-foreground transition-colors hover:bg-accent";
    const tab = "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors hover:bg-accent";
    const current = "bg-sidebar-accent text-sidebar-accent-foreground shadow-tab hover:bg-sidebar-accent";
    const mark = <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-foreground font-display text-base font-extrabold text-background">K</span>;
    return (
      <div className="min-h-screen bg-background font-sans text-foreground md:flex">
        <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:shrink-0" aria-label="Workspace sidebar">
          <div className="flex w-16 flex-col items-center gap-1.5 py-4">
            <Link className="mb-3.5 rounded-full" href="/" aria-label="Ken OS home">{mark}</Link>
            <nav className="grid gap-1.5" aria-label="Modules">
              {moduleList.map(({ id, label, href, icon: Icon }) => (
                <Link key={id} className={cn(tile, active === id && current)} href={href} aria-label={label} title={label} aria-current={active === id ? "page" : undefined}>
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <span className="mt-auto grid size-9 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-quiet" title={email} aria-label={`Signed in as ${email}`}>{email.slice(0, 2).toUpperCase()}</span>
          </div>
          {sections.length > 0 && (
            <div className="hidden w-[208px] py-[18px] pl-1 pr-3 lg:block">
              <p className="px-3 pb-3.5 pt-1 font-display text-lg font-bold leading-tight tracking-[-0.02em]">{detail.title}</p>
              <nav className="grid gap-0.5" aria-label={`${detail.title} sections`}>
                {sections.map(({ key, label, href, icon: Icon, selected }) => (
                  <Link key={key} className={cn(tab, selected ? cn(current, "font-semibold") : "text-sidebar-foreground")} href={href} aria-current={selected ? "location" : undefined}>
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />{label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </aside>

        {mobileOpen && <button className="fixed inset-0 z-40 bg-foreground/40 md:hidden" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
        {mobileOpen && (
          <div ref={sidebarRef} className="fixed inset-x-3 top-3 z-50 max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl bg-card p-3 shadow-2xl md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu" onKeyDown={trapSidebarFocus} id="workspace-sidebar-content">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Modules</span>
              <button className="grid size-9 place-items-center rounded-full hover:bg-accent" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={18} /></button>
            </div>
            <nav className="grid gap-0.5" aria-label="Modules">
              {moduleList.map(({ id, label, href, icon: Icon }) => (
                <Link key={id} className={cn(tab, active === id ? "bg-secondary font-semibold" : "text-sidebar-foreground")} href={href} aria-current={active === id ? "page" : undefined} onClick={() => setMobileOpen(false)}>
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />{label}
                </Link>
              ))}
            </nav>
            {sections.length > 0 && <>
              <p className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{detail.title}</p>
              <nav className="grid gap-0.5" aria-label={`${detail.title} sections`}>
                {sections.map(({ key, label, href, icon: Icon, selected }) => (
                  <Link key={key} className={cn(tab, selected ? "bg-secondary font-semibold" : "text-sidebar-foreground")} href={href} aria-current={selected ? "location" : undefined} onClick={() => setMobileOpen(false)}>
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />{label}
                  </Link>
                ))}
              </nav>
            </>}
            <p className="mt-5 truncate px-1 text-xs text-muted-foreground">{email}</p>
          </div>
        )}

        {/* From md up the content sits on one raised canvas, inset from the window, with the top nav as its header. */}
        <div className="min-w-0 flex-1 md:my-2 md:mr-2 md:min-h-[calc(100vh-16px)] md:rounded-xl md:bg-canvas md:shadow-panel">
          <header className="flex h-14 items-center justify-between gap-4 px-3 md:border-b md:border-border md:px-6">
            <div className="flex min-w-0 items-center gap-2.5 text-sm">
              <button ref={sidebarToggleRef} className="grid size-9 shrink-0 place-items-center rounded-full bg-card shadow-tab md:hidden" type="button" aria-label="Open menu" aria-expanded={mobileOpen} aria-controls="workspace-sidebar-content" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
              <span className="truncate text-muted-foreground">{detail.title}{currentSection && <><span className="px-2">/</span><span className="font-semibold text-foreground">{currentSection.label}</span></>}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-[13px] text-quiet lg:inline" suppressHydrationWarning>{ownerDate()}</span>
              <ModuleSearch preview={preview} />
              <form action="/api/auth/signout" method="post"><Button variant="ghost" type="submit" className="text-xs">Sign out</Button></form>
            </div>
          </header>
          {sections.length > 1 && (
            <nav className="flex gap-1 overflow-x-auto px-3 pb-1 md:px-6 md:pt-3 lg:hidden" aria-label={`${detail.title} sections`}>
              {sections.map(({ key, label, href, selected }) => (
                <Link key={key} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors", selected ? "bg-card font-semibold text-foreground shadow-tab" : "text-sidebar-foreground hover:bg-accent")} href={href} aria-current={selected ? "location" : undefined}>{label}</Link>
              ))}
            </nav>
          )}
          <main className="min-w-0" id="main-content">{termLookup ? <TermLookup module={detail.title}>{children}</TermLookup> : children}</main>
          <Toaster />
        </div>
      </div>
    );
  }

  // The Writing Studio mockup keeps its own collapsible rail until it is rebuilt.
  return (
    <div className="min-h-screen bg-background font-sans text-foreground md:flex">
      <aside className={cn("h-[60px] border-b border-sidebar-border md:sticky md:top-0 md:h-screen md:shrink-0 md:border-b-0 md:border-r", desktopCollapsed ? "md:w-[64px]" : "md:w-[264px] xl:w-[276px]")} aria-label="Workspace sidebar">
        {mobileOpen && <button className="fixed inset-0 z-40 bg-foreground/50 md:hidden" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
        <div
          ref={sidebarRef}
          className={cn(
            "flex flex-col bg-sidebar text-sidebar-foreground md:h-screen",
            mobileOpen ? "fixed inset-y-3 left-3 z-50 w-[min(308px,calc(100vw-24px))] rounded-xl bg-card shadow-2xl md:static md:w-auto md:rounded-none md:bg-sidebar md:shadow-none" : "h-[60px] md:h-screen",
          )}
          role={mobileOpen ? "dialog" : undefined}
          aria-modal={mobileOpen ? "true" : undefined}
          aria-label={mobileOpen ? "Navigation menu" : undefined}
          onKeyDown={trapSidebarFocus}
        >
          <div className={cn("flex h-[60px] shrink-0 items-center justify-between px-4 md:h-16 md:border-b md:border-sidebar-border", mobileOpen && "border-b border-sidebar-border", desktopCollapsed && "md:justify-center md:px-2")}>
            <Link className="flex items-center gap-2.5 font-display text-xl font-bold tracking-[-0.03em]" href="/" aria-label="Ken OS home" onClick={() => setMobileOpen(false)}>
              <span className="grid size-9 place-items-center rounded-full bg-primary text-lg text-primary-foreground">K</span>
              <span className={cn(desktopCollapsed && "md:hidden")}>ken<span className="text-muted-foreground">.os</span></span>
            </Link>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-6", mobileOpen ? "block" : "hidden md:block", desktopCollapsed && "md:px-2")} id="workspace-sidebar-content">
            <div>
              <p className={cn(sidebarLabel, desktopCollapsed && "md:sr-only")}>WORKSPACE</p>
              <nav className="grid gap-1" aria-label="Modules">
                {moduleList.map(({ id, label, href, icon: Icon }) => (
                  <Link key={id} className={cn(sidebarLink, active === id ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-tab" : "text-muted-foreground", desktopCollapsed && "md:justify-center md:px-2")} href={href} aria-label={desktopCollapsed ? label : undefined} title={desktopCollapsed ? label : undefined} aria-current={active === id ? "page" : undefined} onClick={() => setMobileOpen(false)}>
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span className={cn(desktopCollapsed && "md:sr-only")}>{label}</span>
                  </Link>
                ))}
              </nav>
            </div>
            {writingPreviewGroups.map((group) => (
              <div className={cn("mt-7", desktopCollapsed && "md:hidden")} key={group.title}>
                <p className={sidebarLabel}>{group.title.toUpperCase()}</p>
                <nav className="grid gap-1" aria-label={`${group.title} preview actions`}>
                  {group.items.map(({ label, icon: Icon }) => <button className={cn(sidebarLink, "w-full text-left text-muted-foreground")} key={label} type="button" onClick={() => { onPreviewAction?.(label); setMobileOpen(false); }}><Icon size={17} strokeWidth={1.8} aria-hidden="true" />{label}</button>)}
                </nav>
              </div>
            ))}
          </div>
          <div className={cn("items-center gap-2.5 border-t border-sidebar-border px-4 py-3", mobileOpen ? "flex" : "hidden md:flex", desktopCollapsed && "md:justify-center md:px-2")} title={email}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">{email[0]?.toUpperCase()}</span>
            <span className={cn("min-w-0", desktopCollapsed && "md:hidden")}><small className="block truncate text-xs text-muted-foreground">{email}</small></span>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="min-h-[calc(100vh-60px)] bg-background md:min-h-screen">
          <header className="flex h-16 items-center justify-between gap-4 border-b border-border px-5">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <button className="grid size-9 shrink-0 place-items-center rounded-lg border border-border hover:bg-muted md:hidden" type="button" aria-label="Open sidebar" aria-controls="workspace-sidebar-content" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={17} /></button>
              <button className="hidden size-9 shrink-0 place-items-center rounded-lg border border-border hover:bg-muted md:grid" type="button" aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-controls="workspace-sidebar-content" aria-expanded={!desktopCollapsed} onClick={() => setDesktopCollapsed((value) => !value)}>{desktopCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
              <span className="truncate"><span className="hidden text-muted-foreground sm:inline">Ken OS <span className="px-2 text-border">/</span></span>{detail.title}<span className="px-2 text-border">/</span>Draft</span>
            </div>
            {headerActions}
          </header>
          <main className="min-w-0" id="main-content">{termLookup ? <TermLookup module={detail.title}>{children}</TermLookup> : children}</main>
          <Toaster />
        </div>
      </div>
    </div>
  );
}
