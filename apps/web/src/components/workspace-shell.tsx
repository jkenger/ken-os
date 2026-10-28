"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookMarked,
  ChevronRight,
  BookOpenText,
  FileText,
  FlaskConical,
  Globe,
  Map as MapIcon,
  Palette,
  Library,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BrandMark } from "@/components/brand";
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
import { InlineSeparator } from "@/components/inline-separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  // No sub-items: Profile's page carries its own section index.
  profile: { title: "Profile", sections: [] },
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

/** Modules too wide for a labelled sidebar: they open with it folded to icons. Ctrl or Cmd + B unfolds it. Profile is
 *  one since 28 Oct 2026: its three columns need the width. */
const wideModules: Module[] = ["studio", "lab", "profile"];

/** The open module's sections, nested under it in the sidebar. A module with one section has nothing to nest. */
function SectionList({ sections, onPick }: { sections: Section[]; onPick?: () => void }) {
  return (
    <SidebarMenuSub aria-label="Sections">
      {sections.map(({ key, label, href, selected, count }) => (
        <SidebarMenuSubItem key={key}>
          <SidebarMenuSubButton asChild isActive={selected} size="md" className="max-md:h-11">
            <Link href={href} aria-current={selected ? "location" : undefined} onClick={onPick}>
              <span>{label}</span>
              {count !== undefined && <span className="ml-auto font-mono text-xs text-muted-foreground">{count}</span>}
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
    </SidebarMenuSub>
  );
}

/** The KEOS sidebar on shadcn's Sidebar: the mark and name, every module with its label, the open module's sections
 *  nested under it, and the signed-in account at the foot. It sits on the page ground, split from the content by one
 *  1px seam, and folds to icons (Ctrl B). On a phone, shadcn renders the same list as a sheet. */
function ShellSidebar({
  email,
  active,
  moduleList,
  sections,
}: {
  email: string;
  active: Module;
  moduleList: ModuleLink[];
  sections: Section[];
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const close = isMobile ? () => setOpenMobile(false) : undefined;
  const nested = sections.length > 1;

  return (
    <Sidebar collapsible="icon" aria-label="Workspace sidebar" className="group-data-[side=left]:border-r-0">
      <SidebarHeader className="h-12 flex-row items-center justify-between border-b px-4 group-data-[collapsible=icon]:px-3.5">
        <Link href="/" aria-label="KEOS home" className="flex items-center gap-2 rounded-md" onClick={close}>
          <BrandMark />
          <span className="font-heading text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            KEOS
          </span>
        </Link>
        {isMobile && (
          <Button variant="ghost" size="icon" aria-label="Close menu" onClick={close}>
            <X />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-1" aria-label="Modules">
            {moduleList.map(({ id, label, href, icon: Icon }) => (
              <SidebarMenuItem key={id}>
                <SidebarMenuButton
                  asChild
                  isActive={active === id}
                  className="max-md:h-11"
                  tooltip={{ children: label, sideOffset: 6 }}
                >
                  <Link href={href} aria-current={active === id ? "page" : undefined} onClick={close}>
                    <Icon strokeWidth={1.5} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
                {active === id && nested && <SectionList sections={sections} onPick={close} />}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex min-w-0 items-center gap-2 rounded-md p-1 group-data-[collapsible=icon]:p-0.5"
              tabIndex={0}
              aria-label={`Signed in as ${email}`}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
                {email.slice(0, 2).toUpperCase()}
              </span>
              <span className="truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                {email}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" sideOffset={6}>
            {email}
          </TooltipContent>
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  );
}

/** The content beside the sidebar: a 48px header with the sidebar toggle, breadcrumb, date, search and sign out, then
 *  the page. The sections show as a row of tabs only while the sidebar can't show them (folded, or on a phone); the
 *  row wraps rather than scrolls, so no tab is cut off at the screen's edge. A page with its own section index turns
 *  the row off. */
function ShellInset({
  title,
  sections,
  tabs,
  children,
}: {
  title: string;
  sections: Section[];
  tabs: boolean;
  children: ReactNode;
}) {
  const { open, isMobile } = useSidebar();
  const currentSection = sections.find((section) => section.selected);
  const sectionTabs = tabs && sections.length > 1 && (isMobile || !open);
  return (
    // Flush against the sidebar on one ground, split by a 1px seam.
    <SidebarInset className="min-w-0 md:min-h-svh md:border-l">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-page">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <SidebarTrigger
            className="-ml-1.5"
            aria-label={isMobile ? "Open menu" : open ? "Hide sidebar" : "Show sidebar"}
            aria-expanded={isMobile ? undefined : open}
            title="Ctrl B"
          />
          <InlineSeparator className="mr-1 hidden h-4 md:block" />
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
      {sectionTabs && (
        <nav className="flex flex-wrap gap-1 px-page pt-3" aria-label={`${title} sections`}>
          {sections.map(({ key, label, href, selected }) => (
            <Link
              key={key}
              className={cn(
                "flex h-8 shrink-0 items-center rounded-md px-3 text-sm transition-colors max-md:h-11",
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
  sectionTabs = true,
  tab,
  sectionCounts,
}: {
  email: string;
  active: Module;
  children: ReactNode;
  termLookup?: boolean;
  /** False when the page carries its own section index, so the folded shell doesn't repeat it as a row of tabs. */
  sectionTabs?: boolean;
  tab?: EngineeringTab;
  /** A count beside a section in the sidebar, by the section's href. */
  sectionCounts?: Record<string, number>;
}) {
  const detail = moduleDetails[active];
  const pathname = usePathname();
  // Engineering's nested pages (a topic, the assessment, evidence) highlight one of its four sidebar sections.
  const engineeringTab = active === "lab" ? (tab ?? tabForPath(pathname)) : null;
  const [hash, setHash] = useState("");
  // Whether the sidebar shows its labels, kept in shadcn's sidebar_state cookie; Ctrl or Cmd + B toggles it. Wide
  // modules always open folded, whatever the cookie says.
  const wide = wideModules.includes(active);
  const [sidebarOpen, setSidebarOpen] = useState(!wide);

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);

  useEffect(() => {
    if (!wide && document.cookie.split("; ").includes("sidebar_state=false")) setSidebarOpen(false);
  }, [wide]);

  const sections = detail.sections.map(({ label, href, icon }, index) => {
    const selected = engineeringTab
      ? tabForPath(href) === engineeringTab
      : href === pathname + hash || (index === 0 && pathname === href && !hash);
    return { key: href, label, href, icon, selected, count: sectionCounts?.[href] };
  });
  const content = termLookup ? <TermLookup module={detail.title}>{children}</TermLookup> : children;

  // The KEOS shell, following shadcn/ui's sidebar anatomy: one labelled sidebar (232px, folding to a 48px icon rail)
  // beside one content inset, both on the page ground.
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        style={{ "--sidebar-width": "14.5rem", "--sidebar-width-icon": "3rem" } as CSSProperties}
        className="min-h-screen bg-sidebar font-sans text-foreground"
      >
        <ShellSidebar email={email} active={active} moduleList={modules} sections={sections} />
        <ShellInset title={detail.title} sections={sections} tabs={sectionTabs}>
          {content}
        </ShellInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
