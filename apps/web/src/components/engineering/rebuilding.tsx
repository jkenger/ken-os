import { WorkspaceShell } from "@/components/workspace-shell";
import type { EngineeringTab } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { PageHeading, panel } from "./kit";

// Stands in for an Engineering page while the rebuild replaces it (docs/architecture/engineering-rebuild.md, section 9).
// Each slice swaps its pages for the real ones; this file goes in the last slice.

export function Rebuilding({ email, title, tab }: { email: string; title: string; tab: EngineeringTab }) {
  return (
    <WorkspaceShell email={email} active="lab" tab={tab}>
      <div className="mx-auto max-w-[1500px] px-3 pb-9 pt-6 md:px-5 md:pt-[30px]">
        <PageHeading title={title} />
        <section className={cn(panel, "mx-[5px] p-[23px] md:mx-3.5 md:p-7")}>
          <h2 className="text-base font-semibold">Rebuilding</h2>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Back with the new Engineering flow</p>
        </section>
      </div>
    </WorkspaceShell>
  );
}
