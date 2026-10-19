"use client";

import type { ReactNode } from "react";
import { BookMarked, ChevronsUpDown, FlaskConical, Search, UserRound } from "lucide-react";
import { Back, Badge as KitBadge, Coverage, Fact, Notice, Rail, SectionTitle } from "@/components/engineering/kit";
import { panel, selectedRow, selectedSurface } from "@/components/surfaces";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeEditor } from "@/components/ui/code-editor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// One sample per component in the studio manifest, keyed by its id. Each renders the real component with sample
// content from Loots. Overlays show their trigger; opening one uses the real component. A component with no entry
// shows "No preview" in the studio.

const buttonVariants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const badgeVariants = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;

const topics = [
  { topic: "Effects & dependencies", status: "Learned" },
  { topic: "Retry & backoff", status: "In progress" },
  { topic: "Caching", status: "Not started" },
];

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export const previews: Record<string, () => ReactNode> = {
  "ui/alert": () => (
    <div className="grid w-full max-w-md gap-3">
      <Alert>
        <AlertTitle>Exercise saved</AlertTitle>
        <AlertDescription>Claude can read it now.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t save</AlertTitle>
        <AlertDescription>Check your connection and try again.</AlertDescription>
      </Alert>
    </div>
  ),
  "ui/badge": () => (
    <Row>
      {badgeVariants.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </Row>
  ),
  "ui/button": () => (
    <Row>
      {buttonVariants.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </Row>
  ),
  "ui/card": () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Retry & backoff</CardTitle>
        <CardDescription>Chapter 2 · In progress</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">2 of 3 tasks done</CardContent>
    </Card>
  ),
  "ui/code-editor": () => (
    <CodeEditor
      label="Sample code"
      readOnly
      className="w-full max-w-md"
      value={"const total = items.length;\nreturn total > 0;"}
    />
  ),
  "ui/collapsible": () => (
    <Collapsible className="w-full max-w-sm">
      <CollapsibleTrigger asChild>
        <Button variant="outline">
          Show steps <ChevronsUpDown />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 text-sm text-muted-foreground">Read, Build, Explain</CollapsibleContent>
    </Collapsible>
  ),
  "ui/command": () => (
    <Command className={cn(panel, "w-full max-w-sm")}>
      <CommandInput placeholder="Find a topic" />
      <CommandList>
        <CommandEmpty>No topics match</CommandEmpty>
        <CommandGroup heading="Topics">
          {topics.map((item) => (
            <CommandItem key={item.topic}>{item.topic}</CommandItem>
          ))}
        </CommandGroup>
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
  "ui/input": () => <Input className="max-w-xs" placeholder="Topic name" aria-label="Topic name" />,
  "ui/input-group": () => (
    <InputGroup className="max-w-xs">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="Find a component" aria-label="Find a component" />
    </InputGroup>
  ),
  "ui/label": () => (
    <div className="grid max-w-xs gap-2">
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
      <Pill tone="partial">2 of 3</Pill>
      <Pill tone="gap">Failed</Pill>
      <Pill tone="neutral">Not run</Pill>
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
  "ui/progress": () => <Progress value={36} className="max-w-xs" aria-label="5 of 14 learned" />,
  "ui/separator": () => (
    <div className="w-full max-w-xs text-sm">
      Read
      <Separator className="my-3" />
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
    <SidebarProvider className="min-h-0 w-56 overflow-hidden rounded-lg border">
      <Sidebar collapsible="none" className="w-full">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Modules</SidebarGroupLabel>
            <SidebarMenu>
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
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <BookMarked aria-hidden="true" />
                  Terms
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  ),
  "ui/skeleton": () => (
    <div className="grid w-full max-w-xs gap-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  ),
  "ui/sonner": () => (
    <Button variant="outline" onClick={() => toast({ tone: "success", title: "Draft saved" })}>
      Show a toast
    </Button>
  ),
  "ui/switch": () => (
    <div className="flex items-center gap-2 text-sm">
      <Switch id="studio-switch-sample" defaultChecked />
      <Label htmlFor="studio-switch-sample">Changed</Label>
    </div>
  ),
  "ui/table": () => (
    <Table className="max-w-md">
      <TableHeader>
        <TableRow>
          <TableHead>Topic</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topics.map((item) => (
          <TableRow key={item.topic}>
            <TableCell>{item.topic}</TableCell>
            <TableCell>{item.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  "ui/tabs": () => (
    <Tabs defaultValue="topic" className="w-full max-w-sm">
      <TabsList>
        <TabsTrigger value="topic">Topic</TabsTrigger>
        <TabsTrigger value="review">Review</TabsTrigger>
      </TabsList>
      <TabsContent value="topic" className="text-sm">
        Tasks and status
      </TabsContent>
      <TabsContent value="review" className="text-sm">
        Claude&apos;s review
      </TabsContent>
    </Tabs>
  ),
  "ui/textarea": () => <Textarea className="max-w-sm" placeholder="Your own words" aria-label="Your own words" />,
  "ui/toaster": () => (
    <Button variant="outline" onClick={() => toast({ title: "Copied. Paste it in Claude" })}>
      Show a toast
    </Button>
  ),
  "ui/toggle": () => (
    <Row>
      <Toggle aria-label="Bold">Bold</Toggle>
      <Toggle variant="outline" aria-label="Italic">
        Italic
      </Toggle>
    </Row>
  ),
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
  "kit/badge": () => <KitBadge>In progress</KitBadge>,
  "kit/back": () => <Back href="/studio">Design Studio</Back>,
  "kit/fact": () => (
    <dl className="w-full max-w-xs">
      <Fact label="Chapter" first>
        2
      </Fact>
      <Fact label="Status">In progress</Fact>
    </dl>
  ),
  "kit/rail": () => (
    <div className="w-full max-w-xs">
      <Rail level="mid" />
    </div>
  ),
  "kit/coverage": () => (
    <div className="w-full max-w-xs">
      <Coverage met={3} total={5} />
    </div>
  ),
  "kit/section-title": () => (
    <div className="w-full max-w-sm">
      <SectionTitle title="Tasks" action={<Button size="sm">Continue</Button>} />
    </div>
  ),
  "kit/notice": () => (
    <div className="w-full max-w-sm">
      <Notice>Claude saved a new exercise.</Notice>
      <Notice tone="error">This exercise doesn&apos;t check out.</Notice>
    </div>
  ),
  "surfaces/panel": () => <div className={cn(panel, "w-full max-w-xs p-5 text-sm")}>A panel</div>,
  "surfaces/selected-surface": () => (
    <div className={cn("w-full max-w-xs rounded-xl border p-5 text-sm", selectedSurface)}>A selected card</div>
  ),
  "surfaces/selected-row": () => (
    <ul className={cn(panel, "w-full max-w-xs divide-y text-sm")}>
      <li className="px-4 py-3">Caching</li>
      <li className={cn("px-4 py-3", selectedRow)}>Retry & backoff</li>
      <li className="px-4 py-3">Queues</li>
    </ul>
  ),
};
