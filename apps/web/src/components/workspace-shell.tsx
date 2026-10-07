"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, BookMarked, ChevronRight, UserRound, BookOpenText, FileText, FlaskConical, Image, LayoutDashboard, Library, Lightbulb, ListTree, Menu, PanelLeftClose, PanelLeftOpen, PenLine, Repeat, Search, Sparkles, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { TermLookup } from "@/components/terms/term-lookup";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { engineering, tabForPath, type EngineeringTab } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";

type Module = "resume" | "skills" | "memory" | "lab" | "writing" | "terms";

const modules = [
  { id: "resume" as const, label: "Resume", href: "/", icon: FileText },
  { id: "skills" as const, label: "Skills", href: "/skills", icon: Sparkles },
  { id: "memory" as const, label: "Project Memory", href: "/memory", icon: BookOpenText },
  { id: "lab" as const, label: "Engineering", href: engineering.overview, icon: FlaskConical },
  { id: "terms" as const, label: "Terms", href: "/terms", icon: BookMarked },
];
const previewModules = [
  ...modules.map((module) => module.id === "memory" ? { ...module, href: "/design-preview?view=memory" } : module),
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

type Section = { key: string; label: string; href: string; icon: typeof FileText; selected: boolean };
type ModuleLink = (typeof previewModules)[number];

/** Today in the owner's time zone, like "Tue, Oct 6, 2026". */
function ownerDate() {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());
}

/** Ctrl or Cmd + K opens shadcn's command dialog over the modules. */
function ModuleSearch({ preview }: { preview: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const list: ModuleLink[] = preview ? previewModules : modules;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button variant="ghost" type="button" onClick={() => setOpen(true)} aria-label="Jump to a module"
        className="h-9 w-9 gap-2 rounded-full bg-card px-0 text-muted-foreground shadow-tab hover:bg-accent sm:w-60 sm:justify-start sm:px-3.5 md:bg-muted md:shadow-none lg:w-72">
        <Search size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="hidden flex-1 text-left text-xs font-normal sm:block">Jump to a module…</span>
        <kbd className="hidden rounded-md bg-card px-1.5 py-0.5 text-[10px] font-normal text-quiet sm:block">Ctrl K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Jump to a module" description="Find a module by name" className="top-[min(17vh,150px)] sm:max-w-[480px]">
        <Command>
          <CommandInput placeholder="Find a module…" aria-label="Search modules" />
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            <CommandGroup heading="Modules">
              {list.map(({ id, label, href, icon: Icon }) => (
                <CommandItem key={id} value={label} onSelect={() => { setOpen(false); router.push(href); }}>
                  <Icon strokeWidth={1.8} aria-hidden="true" />{label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function Brand() {
  return <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary font-display text-sm font-extrabold text-sidebar-primary-foreground">K</span>;
}

/** The Studio sidebar on shadcn's Sidebar (its nested icon block): an icon rail and a section column. On a phone,
 *  shadcn renders it as an 18rem sheet that holds both lists. */
function StudioSidebar({ email, active, moduleList, title, sections }: { email: string; active: Module; moduleList: ModuleLink[]; title: string; sections: Section[] }) {
  const { isMobile, state, setOpenMobile } = useSidebar();

  if (isMobile) {
    const close = () => setOpenMobile(false);
    return (
      <Sidebar>
        <SidebarHeader className="flex-row items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold"><Brand />Ken OS</span>
          <Button variant="ghost" size="icon" aria-label="Close menu" onClick={close}><X /></Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Modules</SidebarGroupLabel>
            <SidebarMenu className="gap-1" aria-label="Modules">
              {moduleList.map(({ id, label, href, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton asChild isActive={active === id}>
                    <Link href={href} aria-current={active === id ? "page" : undefined} onClick={close}><Icon strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          {sections.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>{title}</SidebarGroupLabel>
              <SidebarMenu className="gap-1" aria-label={`${title} sections`}>
                {sections.map(({ key, label, href, icon: Icon, selected }) => (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton asChild isActive={selected}>
                      <Link href={href} aria-current={selected ? "location" : undefined} onClick={close}><Icon strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter><p className="truncate px-2 text-xs text-muted-foreground">{email}</p></SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" aria-label="Workspace sidebar" className="overflow-hidden group-data-[side=left]:border-r-0 *:data-[sidebar=sidebar]:flex-row">
      <Sidebar collapsible="none" className="w-(--sidebar-width-icon) shrink-0 border-r border-sidebar-border">
        <SidebarHeader><Link href="/" aria-label="Ken OS home"><Brand /></Link></SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu className="gap-1" aria-label="Modules">
              {moduleList.map(({ id, label, href, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton asChild isActive={active === id} className="size-8 justify-center" tooltip={{ children: label, hidden: false, sideOffset: 6 }}>
                    <Link href={href} aria-label={label} aria-current={active === id ? "page" : undefined}><Icon strokeWidth={1.8} aria-hidden="true" /></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="grid size-8 place-items-center rounded-lg bg-secondary text-[11px] font-semibold text-quiet" tabIndex={0} aria-label={`Signed in as ${email}`}>{email.slice(0, 2).toUpperCase()}</span>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" sideOffset={6}>{email}</TooltipContent>
          </Tooltip>
        </SidebarFooter>
      </Sidebar>
      {sections.length > 0 && (
        <Sidebar collapsible="none" className="hidden w-[13rem] shrink-0 lg:flex" inert={state === "collapsed" || undefined}>
          <SidebarHeader className="h-14 justify-center px-4">
            <p className="truncate font-display text-base font-semibold tracking-[-0.02em] text-foreground">{title}</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu className="gap-1" aria-label={`${title} sections`}>
                {sections.map(({ key, label, href, icon: Icon, selected }) => (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton asChild isActive={selected}>
                      <Link href={href} aria-current={selected ? "location" : undefined}><Icon strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      )}
    </Sidebar>
  );
}

/** The raised content inset: a 56px header with the section toggle, breadcrumb, date, search and sign out. */
function StudioInset({ title, sections, preview, children }: { title: string; sections: Section[]; preview: boolean; children: ReactNode }) {
  const { open } = useSidebar();
  const currentSection = sections.find((section) => section.selected);
  return (
    <SidebarInset className="md:m-2 md:ml-0 md:min-h-[calc(100svh-16px)] md:rounded-xl md:shadow-panel">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-3 md:border-b md:border-border md:px-4">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <SidebarTrigger className="md:hidden" aria-label="Open menu" />
          {sections.length > 0 && <>
            <SidebarTrigger className="-ml-1 hidden lg:inline-flex" aria-label={open ? "Hide sections" : "Show sections"} aria-expanded={open} title="Ctrl B" />
            <Separator orientation="vertical" className="mr-2 hidden h-4! lg:block" />
          </>}
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
              <li className={cn("truncate", currentSection && "hidden sm:inline-flex")}>{sections[0] && currentSection ? <Link className="transition-colors hover:text-foreground" href={sections[0].href}>{title}</Link> : <span className="text-foreground">{title}</span>}</li>
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
          <form action="/api/auth/signout" method="post"><Button variant="ghost" size="sm" type="submit" className="text-xs">Sign out</Button></form>
        </div>
      </header>
      {sections.length > 1 && (
        <nav className={cn("flex gap-1 overflow-x-auto px-3 pt-3 md:px-4", open && "lg:hidden")} aria-label={`${title} sections`}>
          {sections.map(({ key, label, href, selected }) => (
            <Link key={key} className={cn("h-8 shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors", selected ? "bg-sidebar-accent font-medium text-foreground shadow-tab" : "text-sidebar-foreground hover:bg-accent")} href={href} aria-current={selected ? "location" : undefined}>{label}</Link>
          ))}
        </nav>
      )}
      <div className="min-w-0 flex-1" id="main-content">{children}</div>
      <Toaster />
    </SidebarInset>
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
  // The section column's open state, kept in shadcn's sidebar_state cookie; Ctrl or Cmd + B toggles it.
  const [sectionsOpen, setSectionsOpen] = useState(true);

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);

  useEffect(() => {
    if (document.cookie.split("; ").includes("sidebar_state=false")) setSectionsOpen(false);
  }, []);

  const moduleList: ModuleLink[] = preview ? previewModules : modules;
  const sections = (preview && active === "memory" ? previewMemorySections : detail.sections).map(({ label, href: originalHref, icon }, index) => {
    const href = preview && active === "memory" ? originalHref.replace("/memory", "/design-preview?view=memory") : originalHref;
    const selected = engineeringTab ? tabForPath(href) === engineeringTab : preview && active === "memory"
      ? (index === 0 ? !hash : href.endsWith(hash) && Boolean(hash))
      : href === pathname + hash || (index === 0 && ((pathname === href && !hash) || preview));
    return { key: href, label, href, icon, selected };
  });
  const content = termLookup ? <TermLookup module={detail.title}>{children}</TermLookup> : children;

  if (!studio) {
    return <WritingPreviewShell email={email} title={detail.title} moduleList={moduleList} active={active} headerActions={headerActions} onPreviewAction={onPreviewAction}>{content}</WritingPreviewShell>;
  }

  // The Studio shell, following shadcn/ui's sidebar anatomy (the nested icon sidebar block): an icon rail and a
  // section column on the stone sidebar, beside one raised content inset. The column shows from 1024px.
  return (
    <TooltipProvider delayDuration={0}>
    <SidebarProvider open={sectionsOpen} onOpenChange={setSectionsOpen}
      style={{ "--sidebar-width": "var(--shell-width)", "--sidebar-width-icon": "calc(3rem + 1px)" } as CSSProperties}
      className={cn("min-h-screen bg-sidebar font-sans text-foreground [--shell-width:calc(3rem+1px)]", sections.length > 0 && "lg:[--shell-width:calc(16rem+1px)]")}>
      <StudioSidebar email={email} active={active} moduleList={moduleList} title={detail.title} sections={sections} />
      <StudioInset title={detail.title} sections={sections} preview={preview}>{content}</StudioInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}

/** The Writing Studio mockup keeps its own collapsible rail until it is rebuilt; its phone menu is shadcn's Sheet. */
function WritingPreviewShell({ email, title, moduleList, active, headerActions, onPreviewAction, children }: { email: string; title: string; moduleList: ModuleLink[]; active: Module; headerActions?: ReactNode; onPreviewAction?: (label: string) => void; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const brand = (collapsed: boolean, close?: () => void) => (
    <Link className="flex items-center gap-2.5 font-display text-xl font-bold tracking-[-0.03em]" href="/" aria-label="Ken OS home" onClick={close}>
      <span className="grid size-9 place-items-center rounded-full bg-primary text-lg text-primary-foreground">K</span>
      <span className={cn(collapsed && "md:hidden")}>ken<span className="text-muted-foreground">.os</span></span>
    </Link>
  );
  const nav = (collapsed: boolean, close: () => void) => (
    <>
      <div>
        <p className={cn(sidebarLabel, collapsed && "md:sr-only")}>WORKSPACE</p>
        <nav className="grid gap-1" aria-label="Modules">
          {moduleList.map(({ id, label, href, icon: Icon }) => (
            <Link key={id} className={cn(sidebarLink, active === id ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-tab" : "text-muted-foreground", collapsed && "md:justify-center md:px-2")} href={href} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} aria-current={active === id ? "page" : undefined} onClick={close}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span className={cn(collapsed && "md:sr-only")}>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
      {writingPreviewGroups.map((group) => (
        <div className={cn("mt-7", collapsed && "md:hidden")} key={group.title}>
          <p className={sidebarLabel}>{group.title.toUpperCase()}</p>
          <nav className="grid gap-1" aria-label={`${group.title} preview actions`}>
            {group.items.map(({ label, icon: Icon }) => (
              <Button variant="ghost" className={cn(sidebarLink, "w-full justify-start text-muted-foreground")} key={label} type="button" onClick={() => { onPreviewAction?.(label); close(); }}>
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />{label}
              </Button>
            ))}
          </nav>
        </div>
      ))}
    </>
  );
  const account = (collapsed: boolean) => (
    <div className={cn("flex items-center gap-2.5 border-t border-sidebar-border px-4 py-3", collapsed && "md:justify-center md:px-2")} title={email}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">{email[0]?.toUpperCase()}</span>
      <span className={cn("min-w-0", collapsed && "md:hidden")}><small className="block truncate text-xs text-muted-foreground">{email}</small></span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground md:flex">
      <aside className={cn("hidden border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col md:border-r", desktopCollapsed ? "md:w-[64px]" : "md:w-[264px] xl:w-[276px]")} aria-label="Workspace sidebar">
        <div className={cn("flex h-16 shrink-0 items-center border-b border-sidebar-border px-4", desktopCollapsed && "justify-center px-2")}>{brand(desktopCollapsed)}</div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-6", desktopCollapsed && "px-2")} id="workspace-sidebar-content">{nav(desktopCollapsed, () => {})}</div>
        {account(desktopCollapsed)}
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(308px,calc(100vw-24px))] gap-0 p-0" aria-describedby={undefined}>
          <SheetTitle className="flex h-[60px] shrink-0 items-center border-b border-sidebar-border px-4">{brand(false, () => setMobileOpen(false))}</SheetTitle>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6">{nav(false, () => setMobileOpen(false))}</div>
          {account(false)}
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <div className="min-h-screen bg-background">
          <header className="flex h-16 items-center justify-between gap-4 border-b border-border px-5">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <Button variant="outline" size="icon-lg" className="rounded-lg md:hidden" type="button" aria-label="Open sidebar" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={17} /></Button>
              <Button variant="outline" size="icon-lg" className="hidden rounded-lg md:inline-flex" type="button" aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-controls="workspace-sidebar-content" aria-expanded={!desktopCollapsed} onClick={() => setDesktopCollapsed((value) => !value)}>{desktopCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</Button>
              <span className="truncate"><span className="hidden text-muted-foreground sm:inline">Ken OS <span className="px-2 text-border">/</span></span>{title}<span className="px-2 text-border">/</span>Draft</span>
            </div>
            {headerActions}
          </header>
          <main className="min-w-0" id="main-content">{children}</main>
          <Toaster />
        </div>
      </div>
    </div>
  );
}
