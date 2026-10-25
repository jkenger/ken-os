"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookMarked,
  ChevronRight,
  BookOpenText,
  FileText,
  FlaskConical,
  FolderOpen,
  Globe,
  Map as MapIcon,
  Palette,
  Library,
  Search,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { TermLookup } from "@/components/terms/term-lookup";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { engineering, tabForPath, type EngineeringTab } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";

type Module = "profile" | "portfolio" | "memory" | "lab" | "terms" | "studio";

const modules = [
  { id: "profile" as const, label: "Profile", href: "/profile", icon: UserRound },
  { id: "portfolio" as const, label: "Portfolio", href: "/portfolio", icon: Globe },
  { id: "memory" as const, label: "Project Memory", href: "/memory", icon: BookOpenText },
  { id: "lab" as const, label: "Engineering", href: engineering.roadmap(), icon: FlaskConical },
  { id: "terms" as const, label: "Terms", href: "/terms", icon: BookMarked },
  { id: "studio" as const, label: "Design Studio", href: "/studio", icon: Palette },
];

const moduleDetails: Record<
  Module,
  {
    title: string;
    sections: { label: string; href: string; icon: typeof FileText }[];
  }
> = {
  profile: {
    title: "Profile",
    sections: [
      { label: "Details", href: "/profile", icon: UserRound },
      { label: "Resumes", href: "/profile#resumes", icon: Upload },
      { label: "Public link", href: "/profile#public-link", icon: Globe },
      { label: "Resume", href: "/profile/resume", icon: FileText },
      { label: "Drive file", href: "/profile#drive-file", icon: FolderOpen },
    ],
  },
  portfolio: { title: "Portfolio", sections: [{ label: "Publish", href: "/portfolio", icon: Globe }] },
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
    sections: [{ label: "Roadmap", href: engineering.roadmap(), icon: MapIcon }],
  },
  terms: { title: "Terms", sections: [{ label: "Terms", href: "/terms", icon: BookMarked }] },
  // No section column: the studio needs the width for its tree, canvas and inspector (mockup frame A1).
  studio: { title: "Design Studio", sections: [] },
};

type Section = {
  key: string;
  label: string;
  href: string;
  icon: typeof FileText;
  selected: boolean;
  count?: number;
};
type ModuleLink = (typeof modules)[number];

/** Today in the owner's time zone, like "Tue, Oct 6, 2026". */
function ownerDate() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

/** Ctrl or Cmd + K opens shadcn's command dialog over the modules. */
function ModuleSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
      <Button
        variant="outline"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Jump to a module"
        className="w-9 px-0 font-normal text-muted-foreground sm:w-60 sm:justify-start sm:px-3 lg:w-72"
      >
        <Search size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="hidden flex-1 text-left text-xs font-normal sm:block">Jump to a module…</span>
        <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Jump to a module"
        description="Find a module by name"
        className="top-[min(17vh,150px)] sm:max-w-md"
      >
        <Command>
          <CommandInput placeholder="Find a module…" aria-label="Search modules" />
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            <CommandGroup heading="Modules">
              {modules.map(({ id, label, href, icon: Icon }) => (
                <CommandItem
                  key={id}
                  value={label}
                  onSelect={() => {
                    setOpen(false);
                    router.push(href);
                  }}
                >
                  <Icon strokeWidth={1.8} aria-hidden="true" />
                  {label}
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
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary font-heading text-sm font-extrabold text-sidebar-primary-foreground">
      K
    </span>
  );
}

/** The Loots sidebar on shadcn's Sidebar (its nested icon block): an icon rail and a section column. On a phone,
 *  shadcn renders it as an 18rem sheet that holds both lists. */
function ShellSidebar({
  email,
  active,
  moduleList,
  title,
  sections,
}: {
  email: string;
  active: Module;
  moduleList: ModuleLink[];
  title: string;
  sections: Section[];
}) {
  const { isMobile, state, setOpenMobile } = useSidebar();

  if (isMobile) {
    const close = () => setOpenMobile(false);
    return (
      <Sidebar>
        <SidebarHeader className="flex-row items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Brand />
            Loots
          </span>
          <Button variant="ghost" size="icon" aria-label="Close menu" onClick={close}>
            <X />
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Modules</SidebarGroupLabel>
            <SidebarMenu className="gap-1" aria-label="Modules">
              {moduleList.map(({ id, label, href, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton asChild isActive={active === id}>
                    <Link href={href} aria-current={active === id ? "page" : undefined} onClick={close}>
                      <Icon strokeWidth={1.8} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          {sections.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>{title}</SidebarGroupLabel>
              <SidebarMenu className="gap-1" aria-label={`${title} sections`}>
                {sections.map(({ key, label, href, icon: Icon, selected, count }) => (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton asChild isActive={selected}>
                      <Link href={href} aria-current={selected ? "location" : undefined} onClick={close}>
                        <Icon strokeWidth={1.8} aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {count !== undefined && <SidebarMenuBadge className="font-mono">{count}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar
      collapsible="icon"
      aria-label="Workspace sidebar"
      className="overflow-hidden group-data-[side=left]:border-r-0 *:data-[sidebar=sidebar]:flex-row"
    >
      <Sidebar collapsible="none" className="w-(--sidebar-width-icon) shrink-0 border-r border-sidebar-border">
        <SidebarHeader>
          <Link href="/" aria-label="Loots home">
            <Brand />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu className="gap-1" aria-label="Modules">
              {moduleList.map(({ id, label, href, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    asChild
                    isActive={active === id}
                    className="size-8 justify-center"
                    tooltip={{ children: label, hidden: false, sideOffset: 6 }}
                  >
                    <Link href={href} aria-label={label} aria-current={active === id ? "page" : undefined}>
                      <Icon strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="grid size-8 place-items-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground"
                tabIndex={0}
                aria-label={`Signed in as ${email}`}
              >
                {email.slice(0, 2).toUpperCase()}
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" sideOffset={6}>
              {email}
            </TooltipContent>
          </Tooltip>
        </SidebarFooter>
      </Sidebar>
      {sections.length > 0 && (
        <Sidebar collapsible="none" className="hidden w-52 shrink-0 lg:flex" inert={state === "collapsed" || undefined}>
          <SidebarHeader className="h-12 justify-center border-b px-4">
            <p className="truncate font-heading text-base font-semibold tracking-tight text-foreground">{title}</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu className="gap-1" aria-label={`${title} sections`}>
                {sections.map(({ key, label, href, icon: Icon, selected, count }) => (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton asChild isActive={selected}>
                      <Link href={href} aria-current={selected ? "location" : undefined}>
                        <Icon strokeWidth={1.8} aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {count !== undefined && <SidebarMenuBadge className="font-mono">{count}</SidebarMenuBadge>}
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
function ShellInset({ title, sections, children }: { title: string; sections: Section[]; children: ReactNode }) {
  const { open } = useSidebar();
  const currentSection = sections.find((section) => section.selected);
  return (
    // Flush against the sidebar on one ground, split by a 1px seam, as the console tiles its panels.
    <SidebarInset className="min-w-0 md:min-h-svh md:border-l">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <SidebarTrigger className="md:hidden" aria-label="Open menu" />
          {sections.length > 0 && (
            <>
              <SidebarTrigger
                className="-ml-1 hidden lg:inline-flex"
                aria-label={open ? "Hide sections" : "Show sections"}
                aria-expanded={open}
                title="Ctrl B"
              />
              <Separator orientation="vertical" className="mr-2 hidden h-4! lg:block" />
            </>
          )}
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
              <li className={cn("truncate", currentSection && "hidden sm:inline-flex")}>
                {sections[0] && currentSection ? (
                  <Link className="transition-colors hover:text-foreground" href={sections[0].href}>
                    {title}
                  </Link>
                ) : (
                  <span className="text-foreground">{title}</span>
                )}
              </li>
              {currentSection && (
                <>
                  <li className="hidden sm:inline-flex" aria-hidden="true">
                    <ChevronRight className="size-3.5" />
                  </li>
                  <li className="truncate font-normal text-foreground" aria-current="page">
                    {currentSection.label}
                  </li>
                </>
              )}
            </ol>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground xl:inline" suppressHydrationWarning>
            {ownerDate()}
          </span>
          <ModuleSearch />
          <form action="/api/auth/signout" method="post">
            <Button variant="ghost" size="sm" type="submit" className="text-xs">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      {sections.length > 1 && (
        <nav
          className={cn("flex gap-1 overflow-x-auto px-3 pt-3 md:px-4", open && "lg:hidden")}
          aria-label={`${title} sections`}
        >
          {sections.map(({ key, label, href, selected }) => (
            <Link
              key={key}
              className={cn(
                "h-8 shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                selected
                  ? "bg-sidebar-accent font-medium text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
              href={href}
              aria-current={selected ? "location" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      <div className="min-w-0 flex-1" id="main-content">
        {children}
      </div>
      <Toaster />
    </SidebarInset>
  );
}

export function WorkspaceShell({
  email,
  active,
  children,
  termLookup = true,
  tab,
  sectionCounts,
}: {
  email: string;
  active: Module;
  children: ReactNode;
  termLookup?: boolean;
  tab?: EngineeringTab;
  /** A count beside a section in the column, by the section's href, as Profile's "Details 9". */
  sectionCounts?: Record<string, number>;
}) {
  const detail = moduleDetails[active];
  const pathname = usePathname();
  // Engineering's nested pages (a topic, the assessment, evidence) highlight one of its four sidebar sections.
  const engineeringTab = active === "lab" ? (tab ?? tabForPath(pathname)) : null;
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

  const sections = detail.sections.map(({ label, href, icon }, index) => {
    const selected = engineeringTab
      ? tabForPath(href) === engineeringTab
      : href === pathname + hash || (index === 0 && pathname === href && !hash);
    return { key: href, label, href, icon, selected, count: sectionCounts?.[href] };
  });
  const content = termLookup ? <TermLookup module={detail.title}>{children}</TermLookup> : children;

  // The Loots shell, following shadcn/ui's sidebar anatomy (the nested icon sidebar block): an icon rail and a
  // section column on the sidebar, beside one content inset. The column shows from 1024px.
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        open={sectionsOpen}
        onOpenChange={setSectionsOpen}
        style={{ "--sidebar-width": "var(--shell-width)", "--sidebar-width-icon": "calc(3rem + 1px)" } as CSSProperties}
        className={cn(
          "min-h-screen bg-sidebar font-sans text-foreground [--shell-width:calc(3rem+1px)]",
          sections.length > 0 && "lg:[--shell-width:calc(16rem+1px)]",
        )}
      >
        <ShellSidebar email={email} active={active} moduleList={modules} title={detail.title} sections={sections} />
        <ShellInset title={detail.title} sections={sections}>
          {content}
        </ShellInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
