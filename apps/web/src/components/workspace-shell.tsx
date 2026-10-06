"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, BookMarked, ChevronRight, UserRound, BookOpenText, FileText, FlaskConical, Image, LayoutDashboard, Library, Lightbulb, ListTree, Menu, PanelLeft, PanelLeftClose, PanelLeftOpen, Palette, PenLine, Repeat, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { TermLookup } from "@/components/terms/term-lookup";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  // The section column's open state, kept the way shadcn's sidebar keeps it.
  useEffect(() => {
    if (studio && document.cookie.split("; ").includes("sidebar_state=false")) setDesktopCollapsed(true);
  }, [studio]);

  const toggleSections = () => setDesktopCollapsed((collapsed) => {
    document.cookie = `sidebar_state=${collapsed}; path=/; max-age=${60 * 60 * 24 * 7}`;
    return !collapsed;
  });

  useEffect(() => {
    if (!studio) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSections();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [studio]);

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
    // The Studio shell, following shadcn/ui's sidebar anatomy (the nested icon sidebar block with the inset variant):
    // an icon rail and a section column on the stone sidebar, split by a hairline, beside one raised content inset.
    // Ctrl or Cmd + B collapses the section column, and the choice is kept in shadcn's sidebar_state cookie.
    const menuButton = "flex h-8 w-full items-center gap-2 rounded-md p-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-accent hover:text-foreground [&>svg]:size-4 [&>svg]:shrink-0";
    const activeButton = "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-tab hover:bg-sidebar-accent";
    return (
      <TooltipProvider delayDuration={0}>
        <div className="min-h-screen bg-sidebar font-sans text-foreground md:flex">
          <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:shrink-0" aria-label="Workspace sidebar">
            <div className="flex w-[calc(3rem+1px)] flex-col border-r border-sidebar-border">
              <div className="flex flex-col gap-2 p-2">
                <Link className="grid size-8 place-items-center rounded-lg bg-sidebar-primary font-display text-sm font-extrabold text-sidebar-primary-foreground" href="/" aria-label="Ken OS home">K</Link>
              </div>
              <nav className="flex min-h-0 flex-1 flex-col gap-1 p-2" aria-label="Modules">
                {moduleList.map(({ id, label, href, icon: Icon }) => (
                  <Tooltip key={id}>
                    <TooltipTrigger asChild>
                      <Link className={cn(menuButton, "size-8 justify-center", active === id && activeButton)} href={href} aria-label={label} aria-current={active === id ? "page" : undefined}>
                        <Icon strokeWidth={1.8} aria-hidden="true" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" sideOffset={6}>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </nav>
              <div className="flex flex-col gap-2 p-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="grid size-8 place-items-center rounded-lg bg-secondary text-[11px] font-semibold text-quiet" tabIndex={0} aria-label={`Signed in as ${email}`}>{email.slice(0, 2).toUpperCase()}</span>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" sideOffset={6}>{email}</TooltipContent>
                </Tooltip>
              </div>
            </div>
            {sections.length > 0 && (
              <div className={cn("hidden overflow-hidden transition-[width] duration-200 ease-linear lg:block", desktopCollapsed ? "w-0" : "w-[13rem]")} inert={desktopCollapsed || undefined}>
                <div className="flex h-full w-[13rem] flex-col">
                  <div className="flex h-14 shrink-0 items-center px-4">
                    <p className="truncate font-display text-base font-semibold tracking-[-0.02em]">{detail.title}</p>
                  </div>
                  <nav className="flex flex-col gap-1 p-2" aria-label={`${detail.title} sections`}>
                    {sections.map(({ key, label, href, icon: Icon, selected }) => (
                      <Link key={key} className={cn(menuButton, selected && activeButton)} href={href} aria-current={selected ? "location" : undefined}>
                        <Icon strokeWidth={1.8} aria-hidden="true" /><span className="truncate">{label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              </div>
            )}
          </aside>

          {mobileOpen && <button className="fixed inset-0 z-40 bg-foreground/40 md:hidden" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
          {mobileOpen && (
            <div ref={sidebarRef} className="fixed inset-y-0 left-0 z-50 w-[18rem] overflow-y-auto bg-sidebar p-2 shadow-2xl md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu" onKeyDown={trapSidebarFocus} id="workspace-sidebar-content">
              <div className="flex items-center justify-between p-2">
                <span className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary font-display font-extrabold text-sidebar-primary-foreground">K</span>Ken OS</span>
                <button className="grid size-8 place-items-center rounded-md hover:bg-accent" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={16} /></button>
              </div>
              <p className="flex h-8 items-center px-2 text-xs font-medium text-sidebar-foreground/70">Modules</p>
              <nav className="flex flex-col gap-1" aria-label="Modules">
                {moduleList.map(({ id, label, href, icon: Icon }) => (
                  <Link key={id} className={cn(menuButton, active === id && activeButton)} href={href} aria-current={active === id ? "page" : undefined} onClick={() => setMobileOpen(false)}>
                    <Icon strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
                  </Link>
                ))}
              </nav>
              {sections.length > 0 && <>
                <p className="mt-2 flex h-8 items-center px-2 text-xs font-medium text-sidebar-foreground/70">{detail.title}</p>
                <nav className="flex flex-col gap-1" aria-label={`${detail.title} sections`}>
                  {sections.map(({ key, label, href, icon: Icon, selected }) => (
                    <Link key={key} className={cn(menuButton, selected && activeButton)} href={href} aria-current={selected ? "location" : undefined} onClick={() => setMobileOpen(false)}>
                      <Icon strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
                    </Link>
                  ))}
                </nav>
              </>}
              <p className="mt-4 truncate px-2 text-xs text-muted-foreground">{email}</p>
            </div>
          )}

          {/* shadcn's SidebarInset with the inset variant: m-2 ml-0, rounded-xl and a soft shadow. */}
          <div className="relative flex min-w-0 flex-1 flex-col bg-canvas md:m-2 md:ml-0 md:min-h-[calc(100vh-16px)] md:rounded-xl md:shadow-panel">
            <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-3 md:border-b md:border-border md:px-4">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <button ref={sidebarToggleRef} className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-accent md:hidden" type="button" aria-label="Open menu" aria-expanded={mobileOpen} aria-controls="workspace-sidebar-content" onClick={() => setMobileOpen(true)}><Menu size={16} /></button>
                {sections.length > 0 && <>
                  <button className="-ml-1 hidden size-7 shrink-0 place-items-center rounded-md hover:bg-accent lg:grid" type="button" aria-label={desktopCollapsed ? "Show sections" : "Hide sections"} aria-expanded={!desktopCollapsed} title="Ctrl B" onClick={toggleSections}><PanelLeft size={16} /></button>
                  <span className="mr-2 hidden h-4 w-px bg-border lg:block" aria-hidden="true" />
                </>}
                <nav aria-label="Breadcrumb" className="min-w-0">
                  <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                    <li className={cn("truncate", currentSection && "hidden sm:inline-flex")}>{sections[0] && currentSection ? <Link className="transition-colors hover:text-foreground" href={sections[0].href}>{detail.title}</Link> : <span className="text-foreground">{detail.title}</span>}</li>
                    {currentSection && <>
                      <li className="hidden sm:inline-flex" aria-hidden="true"><ChevronRight className="size-3.5" /></li>
                      <li className="truncate font-normal text-foreground" aria-current="page">{currentSection.label}</li>
                    </>}
                  </ol>
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-[13px] text-quiet xl:inline" suppressHydrationWarning>{ownerDate()}</span>
                <ModuleSearch preview={preview} />
                <form action="/api/auth/signout" method="post"><Button variant="ghost" type="submit" className="text-xs">Sign out</Button></form>
              </div>
            </header>
            {sections.length > 1 && (
              <nav className={cn("flex gap-1 overflow-x-auto px-3 pt-3 md:px-4", !desktopCollapsed && "lg:hidden")} aria-label={`${detail.title} sections`}>
                {sections.map(({ key, label, href, selected }) => (
                  <Link key={key} className={cn("h-8 shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors", selected ? "bg-sidebar-accent font-medium text-foreground shadow-tab" : "text-sidebar-foreground hover:bg-accent")} href={href} aria-current={selected ? "location" : undefined}>{label}</Link>
                ))}
              </nav>
            )}
            <main className="min-w-0 flex-1" id="main-content">{termLookup ? <TermLookup module={detail.title}>{children}</TermLookup> : children}</main>
            <Toaster />
          </div>
        </div>
      </TooltipProvider>
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
