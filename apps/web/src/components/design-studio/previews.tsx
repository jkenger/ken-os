"use client";

import type { ComponentProps, JSXElementConstructor, ReactNode } from "react";
import { ChevronsUpDown, FlaskConical, Search, UserRound } from "lucide-react";
import { Back, Badge as KitBadge, Coverage, Fact, Notice, Rail, SectionTitle } from "@/components/engineering/kit";
import { panel, selectedInset, selectedRow, selectedSurface } from "@/components/surfaces";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { CodeEditor } from "@/components/ui/code-editor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Pill } from "@/components/ui/pill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// One sample per component in the studio manifest, keyed by its id, small enough for a 240 by 180 canvas node. Each
// renders the real component with sample content from Loots. Overlays show their trigger; opening one uses the real component. A component with no entry
// shows "No preview" in the studio. Samples listed in previewProps take those props, which the inspector's Preview tab
// changes (mockup frame D2); they change the sample only and never make a draft.

/** Props the Preview tab changes: a variant group's option, a boolean, or a text. */
export type PreviewProps = Record<string, string | boolean>;

/** Each sample's props and their defaults. A key named like one of the component's variant groups is a choice of its
 *  options; `children` is the label. */
export const previewProps: Record<string, PreviewProps> = {
  "ui/alert": { variant: "default" },
  "ui/badge": { variant: "default", children: "Due Oct 5" },
  "ui/button": { variant: "default", size: "default", disabled: false, children: "Run tests" },
  "ui/input": { disabled: false, placeholder: "Topic name" },
  "ui/kbd": { children: "Ctrl K" },
  "ui/switch": { disabled: false },
  "ui/tabs": { variant: "default" },
  "ui/textarea": { disabled: false, placeholder: "Your own words" },
  "ui/toggle": { variant: "outline", size: "default", disabled: false, children: "Bold" },
  "kit/badge": { children: "In progress" },
};

/** Spreads a sample's props onto a component, typed as that component's props. */
const as = <T extends JSXElementConstructor<any>>(props: PreviewProps) => props as unknown as ComponentProps<T>;

const topics = [
  { topic: "Effects & dependencies", status: "Learned" },
  { topic: "Retry & backoff", status: "In progress" },
  { topic: "Caching", status: "Not started" },
];

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export const previews: Record<string, (props: PreviewProps) => ReactNode> = {
  "ui/alert": (props) => (
    <Alert {...as<typeof Alert>(props)}>
      <AlertTitle>Exercise saved</AlertTitle>
      <AlertDescription>Claude can read it now.</AlertDescription>
    </Alert>
  ),
  "ui/badge": (props) => <Badge {...as<typeof Badge>(props)} />,
  "ui/button": (props) => <Button {...as<typeof Button>(props)} />,
  "ui/card": () => (
    <Card className="w-full gap-1 px-4 py-3">
      <CardTitle>Retry & backoff</CardTitle>
      <CardDescription>2 of 3 tasks done</CardDescription>
    </Card>
  ),
  "ui/code-editor": () => (
    <CodeEditor
      label="Sample code"
      readOnly
      className="w-full"
      value={"const total = items.length;\nreturn total > 0;"}
    />
  ),
  "ui/collapsible": () => (
    <Collapsible defaultOpen className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          Prerequisites <ChevronsUpDown />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-3 text-sm text-muted-foreground">Closures, Scope</CollapsibleContent>
    </Collapsible>
  ),
  "ui/command": () => (
    <Command className={cn(panel, "w-full")}>
      <CommandInput placeholder="Find a topic" />
      <CommandList>
        <CommandEmpty>No topics match</CommandEmpty>
        <CommandItem>Closures</CommandItem>
        <CommandItem>Promises</CommandItem>
      </CommandList>
    </Command>
  ),
  "ui/dialog": () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Show solution</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Show solution?</DialogTitle>
          <DialogDescription>Passing won&apos;t count as proof</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Show solution</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  "ui/disclosure-summary": () => (
    <details className="w-full max-w-sm text-sm">
      <DisclosureSummary>Show hints</DisclosureSummary>
      <p className="mt-2 text-muted-foreground">Start from the failing test.</p>
    </details>
  ),
  "ui/dropdown-menu": () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Roadmap</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Roadmaps</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Full-stack engineer</DropdownMenuItem>
        <DropdownMenuItem>AI engineer</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  "ui/input": (props) => <Input aria-label="Topic name" {...as<typeof Input>(props)} />,
  "ui/input-group": () => (
    <InputGroup>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="Find a topic" aria-label="Find a topic" />
    </InputGroup>
  ),
  "ui/kbd": (props) => <Kbd {...as<typeof Kbd>(props)} />,
  "ui/label": () => (
    <div className="grid w-full gap-2">
      <Label htmlFor="studio-label-sample">Project link</Label>
      <Input id="studio-label-sample" placeholder="https://claude.ai/project/…" />
    </div>
  ),
  "ui/native-select": () => (
    <NativeSelect aria-label="Library" defaultValue="all">
      <NativeSelectOption value="all">All libraries</NativeSelectOption>
      <NativeSelectOption value="repo">This repo</NativeSelectOption>
    </NativeSelect>
  ),
  "ui/pill": () => (
    <Row>
      <Pill tone="solid">Passed</Pill>
      <Pill tone="gap">Failed</Pill>
    </Row>
  ),
  "ui/popover": () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Term</Button>
      </PopoverTrigger>
      <PopoverContent className="text-sm">Backoff: waiting longer after each failed try.</PopoverContent>
    </Popover>
  ),
  "ui/progress": () => <Progress value={36} aria-label="5 of 14 learned" />,
  "ui/separator": () => (
    <div className="w-full text-sm">
      Read
      <Separator className="my-2" />
      Build
    </div>
  ),
  "ui/sheet": () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open topic</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Retry & backoff</SheetTitle>
          <SheetDescription>Chapter 2 · In progress</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
  // Its own provider, and collapsible="none" so it sits in the preview instead of fixing itself to the window.
  "ui/sidebar": () => (
    <SidebarProvider className="min-h-0 w-full overflow-hidden rounded-lg border">
      <Sidebar collapsible="none" className="w-full">
        <SidebarContent>
          <SidebarMenu className="p-1">
            <SidebarMenuItem>
              <SidebarMenuButton>
                <UserRound aria-hidden="true" />
                Profile
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive>
                <FlaskConical aria-hidden="true" />
                Engineering
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  ),
  "ui/skeleton": () => (
    <div className="grid w-full gap-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  ),
  "ui/sonner": () => (
    <Button variant="outline" onClick={() => toast({ tone: "success", title: "Draft saved" })}>
      Show a toast
    </Button>
  ),
  "ui/switch": (props) => (
    <div className="flex items-center gap-2 text-sm">
      <Switch id="studio-switch-sample" defaultChecked {...as<typeof Switch>(props)} />
      <Label htmlFor="studio-switch-sample">Changed</Label>
    </div>
  ),
  "ui/table": () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Topic</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topics.slice(0, 2).map((item) => (
          <TableRow key={item.topic}>
            <TableCell>{item.topic}</TableCell>
            <TableCell>{item.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  "ui/tabs": (props) => (
    <Tabs defaultValue="topic">
      <TabsList {...as<typeof TabsList>(props)}>
        <TabsTrigger value="topic">Topic</TabsTrigger>
        <TabsTrigger value="review">Review</TabsTrigger>
      </TabsList>
    </Tabs>
  ),
  "ui/textarea": (props) => <Textarea aria-label="Your own words" {...as<typeof Textarea>(props)} />,
  "ui/toaster": () => (
    <Button variant="outline" onClick={() => toast({ title: "Copied. Paste it in Claude" })}>
      Show a toast
    </Button>
  ),
  "ui/toggle": (props) => <Toggle defaultPressed aria-label="Bold" {...as<typeof Toggle>(props)} />,
  "ui/toggle-group": () => (
    <ToggleGroup type="single" defaultValue="graph" variant="outline" aria-label="View">
      <ToggleGroupItem value="lanes">Lanes</ToggleGroupItem>
      <ToggleGroupItem value="graph">Graph</ToggleGroupItem>
    </ToggleGroup>
  ),
  "ui/tooltip": () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Search reviews</Button>
      </TooltipTrigger>
      <TooltipContent>Search across topics</TooltipContent>
    </Tooltip>
  ),
  // A Look edit to the wrapper's variant (D6) shows on the primitive it passes it to, with the wrapper's own class.
  "kit/badge": ({ variant, children }) =>
    typeof variant === "string" ? (
      <Badge variant={variant as ComponentProps<typeof Badge>["variant"]} className="align-middle">
        {children}
      </Badge>
    ) : (
      <KitBadge>{children}</KitBadge>
    ),
  "kit/back": () => <Back href="/studio">Design Studio</Back>,
  "kit/fact": () => (
    <dl className="w-full">
      <Fact label="Chapter" first>
        2
      </Fact>
      <Fact label="Status">In progress</Fact>
    </dl>
  ),
  "kit/rail": () => (
    <div className="w-full">
      <Rail level="mid" />
    </div>
  ),
  "kit/coverage": () => (
    <div className="w-full">
      <Coverage met={3} total={5} />
    </div>
  ),
  "kit/section-title": () => (
    <div className="w-full">
      <SectionTitle title="Tasks" action={<Button size="sm">Continue</Button>} />
    </div>
  ),
  "kit/notice": () => (
    <div className="w-full">
      <Notice>Claude saved a new exercise.</Notice>
    </div>
  ),
  "surfaces/panel": () => <div className={cn(panel, "w-full p-4 text-sm")}>A panel</div>,
  "surfaces/selected-surface": () => (
    <div className={cn("w-full rounded-xl border p-4 text-sm", selectedSurface)}>A selected card</div>
  ),
  "surfaces/selected-row": () => (
    <ul className={cn(panel, "w-full divide-y text-sm")}>
      <li className="px-3 py-2">Caching</li>
      <li className={cn("px-3 py-2", selectedRow)}>Retry & backoff</li>
      <li className="px-3 py-2">Queues</li>
    </ul>
  ),
  "surfaces/selected-inset": () => (
    <ul className="grid w-full gap-px text-sm">
      <li className="rounded-md px-3 py-2">Closures</li>
      <li className={cn("rounded-md px-3 py-2", selectedInset)}>State & rendering</li>
      <li className="rounded-md px-3 py-2">Event loop</li>
    </ul>
  ),
};
