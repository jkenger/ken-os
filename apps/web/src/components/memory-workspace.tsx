"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Copy, FileText, KeyRound } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { PILOT_PROJECT_ID, type EvidenceKind } from "@/features/project-memory/contract";
import type { getMemoryOverview } from "@/features/project-memory/store";

type Overview = Awaited<ReturnType<typeof getMemoryOverview>>;
const label = "text-[11px] font-bold tracking-[0.15em] text-muted-foreground";
const textarea = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

async function mutate(path: string, body: unknown, method = "POST") {
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as { error?: string; token?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}

function EvidenceList({ evidence }: { evidence: { kind: string; locator: string; relation: string; availability: string }[] }) {
  if (!evidence.length) return <span>No external source attached · review the claim before approval.</span>;
  return <div className="flex flex-wrap gap-x-4 gap-y-1">{evidence.map((item, index) => {
    let safeUrl: string | null = null;
    try {
      const url = new URL(item.locator);
      if (url.protocol === "https:" && !url.username && !url.password) safeUrl = url.toString();
    } catch { /* A relative repository reference is shown as text. */ }
    return <span key={`${item.locator}-${index}`} className="inline-flex min-w-0 items-center gap-1.5"><FileText size={14} aria-hidden="true" />{item.kind}: {safeUrl ? <a className="break-all underline-offset-4 hover:underline" href={safeUrl} target="_blank" rel="noopener noreferrer">{item.locator}</a> : <span className="break-all">{item.locator}</span>}</span>;
  })}</div>;
}

export function MemoryWorkspace({ email, overview }: { email: string; overview: Overview }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [issuedToken, setIssuedToken] = useState("");
  const decisionKey = useRef<string | null>(null);
  const receiptKey = useRef<string | null>(null);
  const [decision, setDecision] = useState({ title: "", issue: "", choice: "", rationale: "", source: "", sourceKind: "repo_file" as EvidenceKind });
  const [receipt, setReceipt] = useState({ taskKey: "", outcome: "", verification: "", remaining: "", source: "", sourceKind: "commit" as EvidenceKind });
  const approvedDecisions = overview.decisions.filter((item) => item.status === "approved");
  const proposedDecisions = overview.decisions.filter((item) => item.status === "proposed");
  const approvedReceipts = overview.receipts.filter((item) => item.status === "approved");
  const proposedReceipts = overview.receipts.filter((item) => item.status === "proposed");
  const openQuestions = approvedReceipts.flatMap((item) => item.remaining).slice(0, 8);
  const handoffText = [
    `KEN OS HANDOFF · policy v${overview.project.policyVersion}`,
    "Approved decisions:",
    ...approvedDecisions.map((item) => `- ${item.title}: ${item.choice} Why: ${item.rationale} Sources: ${item.evidence.map((ref) => `${ref.kind} ${ref.locator}`).join("; ") || "none attached"}`),
    approvedDecisions.length ? "" : "- None approved yet.",
    "Recent approved outcomes:",
    ...approvedReceipts.slice(0, 5).map((item) => `- ${item.outcome} Sources: ${item.evidence.map((ref) => `${ref.kind} ${ref.locator}`).join("; ") || "none attached"}`),
    approvedReceipts.length ? "" : "- None approved yet.",
    "Open items:",
    ...openQuestions.map((item) => `- ${item}`),
    openQuestions.length ? "" : "- None recorded.",
    `Proposed, not confirmed: ${proposedDecisions.length} decisions and ${proposedReceipts.length} receipts.`,
    "Inspect source references in Ken OS before relying on this handoff.",
  ].join("\n");

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    decisionKey.current ??= crypto.randomUUID();
    try {
      await mutate("/api/memory/decisions", {
        schemaVersion: 1, projectId: PILOT_PROJECT_ID, idempotencyKey: decisionKey.current,
        title: decision.title, issue: decision.issue, choice: decision.choice, rationale: decision.rationale,
        alternatives: [], provenance: "owner_stated",
        evidence: decision.source.trim() ? [{ kind: decision.sourceKind, locator: decision.source.trim(), relation: "supports" }] : [],
      });
      decisionKey.current = null;
      setDecision({ title: "", issue: "", choice: "", rationale: "", source: "", sourceKind: "repo_file" });
      setMessage("Decision saved as proposed. Review it below before it enters the handoff.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save decision."); }
    finally { setBusy(false); }
  }

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    receiptKey.current ??= crypto.randomUUID();
    try {
      await mutate("/api/memory/receipts", {
        schemaVersion: 1, projectId: PILOT_PROJECT_ID, policyVersion: overview.project.policyVersion,
        taskKey: receipt.taskKey, idempotencyKey: receiptKey.current, outcome: receipt.outcome,
        verification: receipt.verification.split("\n").map((item) => item.trim()).filter(Boolean),
        remaining: receipt.remaining.split("\n").map((item) => item.trim()).filter(Boolean),
        evidence: receipt.source.trim() ? [{ kind: receipt.sourceKind, locator: receipt.source.trim(), relation: "supports" }] : [],
      });
      receiptKey.current = null;
      setReceipt({ taskKey: "", outcome: "", verification: "", remaining: "", source: "", sourceKind: "commit" });
      setMessage("Receipt saved as proposed. Review it below before it enters the handoff.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save receipt."); }
    finally { setBusy(false); }
  }

  async function review(kind: "decision" | "receipt", id: string, action: "approve" | "reject") {
    setBusy(true); setMessage("");
    try {
      await mutate("/api/memory/review", { kind, id, action });
      setMessage(`${kind === "decision" ? "Decision" : "Receipt"} ${action === "approve" ? "approved" : "rejected"}.`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not review item."); }
    finally { setBusy(false); }
  }

  async function revise(kind: "decision" | "receipt", id: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = (name: string) => String(form.get(name) ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
    const changes = kind === "decision"
      ? { title: String(form.get("title") ?? ""), issue: String(form.get("issue") ?? ""), choice: String(form.get("choice") ?? ""), rationale: String(form.get("rationale") ?? ""), alternatives: lines("alternatives") }
      : { outcome: String(form.get("outcome") ?? ""), verification: lines("verification"), remaining: lines("remaining") };
    setBusy(true); setMessage("");
    try {
      await mutate("/api/memory/review", { kind, id, action: "revise", changes });
      setMessage("Correction saved with a revision. It remains proposed until approved.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save correction."); }
    finally { setBusy(false); }
  }

  async function issueKey() {
    setBusy(true); setMessage("");
    try {
      const result = await mutate("/api/memory/credentials", {});
      setIssuedToken(result.token ?? "");
      setMessage("New capture key created. Any previous key was revoked. Copy it now; it will not be shown again.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create key."); }
    finally { setBusy(false); }
  }

  async function revokeKey(id: string) {
    setBusy(true); setMessage("");
    try {
      await mutate("/api/memory/credentials", { id }, "DELETE");
      setIssuedToken(""); setMessage("Capture key revoked."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not revoke key."); }
    finally { setBusy(false); }
  }

  return <WorkspaceShell email={email} active="memory">
    <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1320px] border-x border-border">
      <header className="border-b border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className={label}>PROJECT MEMORY</p><span className={label}>KEN OS PILOT · POLICY V{overview.project.policyVersion}</span></div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[720px]"><h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">Pick up where you left off.</h1><p className="mt-3 max-w-[640px] text-base leading-6 text-muted-foreground sm:text-lg sm:leading-7">A source-linked handoff from reviewed decisions and work receipts—not a transcript warehouse.</p></div>
          <Button type="button" onClick={() => void navigator.clipboard.writeText(handoffText).then(() => setMessage("Handoff copied.")).catch(() => setMessage("Could not copy handoff."))}>Copy handoff<ButtonEndIcon><Copy size={15} /></ButtonEndIcon></Button>
        </div>
        {message && <p className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm" role="status">{message}</p>}
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
        <div className="min-w-0">
          <section className="scroll-mt-24 border-b border-border px-5 py-7 sm:px-8 lg:px-10" id="handoff" aria-labelledby="handoff-title">
            <p className={label}>CURRENT STATE</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]" id="handoff-title">Approved handoff</h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">Only items you approved appear as confirmed context for a future agent.</p>
            {approvedDecisions.length === 0 && approvedReceipts.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nothing approved yet. Capture a decision or receipt, then review its evidence below.</p> : <div className="mt-5 space-y-3">
              {approvedDecisions.map((item) => <Card key={item.id}><CardHeader><CardTitle><h3>{item.title}</h3></CardTitle><CardDescription>{item.choice}</CardDescription><CardAction><span className={label}>CONFIRMED</span></CardAction></CardHeader><CardContent><p className="text-sm leading-5 text-muted-foreground">Why: {item.rationale}</p></CardContent><CardFooter className="text-[13px] text-muted-foreground"><EvidenceList evidence={item.evidence} /></CardFooter></Card>)}
              {approvedReceipts.slice(0, 5).map((item) => <Card key={item.id}><CardHeader><CardTitle><h3>Task outcome · {item.taskKey}</h3></CardTitle><CardDescription>{item.outcome}</CardDescription><CardAction><span className={label}>REVIEWED</span></CardAction></CardHeader><CardContent><p className="text-sm text-muted-foreground">Verified: {item.verification.length ? item.verification.join(" · ") : "No verification recorded."}</p></CardContent><CardFooter className="text-[13px] text-muted-foreground"><EvidenceList evidence={item.evidence} /></CardFooter></Card>)}
            </div>}
          </section>
          <section className="scroll-mt-24 border-b border-border px-5 py-7 sm:px-8 lg:px-10" id="decisions" aria-labelledby="decisions-title">
            <p className={label}>REVIEW INBOX</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]" id="decisions-title">Proposed decisions</h2>
            {proposedDecisions.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No decisions waiting for review.</p> : <div className="mt-4 space-y-2">{proposedDecisions.map((item) => <Card key={`${item.id}:${item.updatedAt}`}>
              <CardHeader><CardTitle><h3>{item.title}</h3></CardTitle><CardDescription>{item.choice}</CardDescription><CardAction><span className={label}>{item.provenance.replaceAll("_", " ").toUpperCase()}</span></CardAction></CardHeader>
              <CardContent><p className="text-sm leading-5 text-muted-foreground">Issue: {item.issue}</p><p className="mt-2 text-sm leading-5 text-muted-foreground">Why: {item.rationale}</p>{item.alternatives.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Alternatives: {item.alternatives.join(" · ")}</p>}
                <details className="group mt-4 border-t border-border pt-3"><DisclosureSummary className="text-xs font-semibold">Correct this draft</DisclosureSummary><form className="mt-3 grid gap-2" onSubmit={(event) => void revise("decision", item.id, event)}><label className="text-xs">Title<Input name="title" required maxLength={160} defaultValue={item.title} /></label><label className="text-xs">Issue<textarea name="issue" className={textarea} required maxLength={1000} defaultValue={item.issue} /></label><label className="text-xs">Choice<textarea name="choice" className={textarea} required maxLength={1000} defaultValue={item.choice} /></label><label className="text-xs">Rationale<textarea name="rationale" className={textarea} required maxLength={2000} defaultValue={item.rationale} /></label><label className="text-xs">Alternatives · one per line<textarea name="alternatives" className={textarea} defaultValue={item.alternatives.join("\n")} /></label><Button size="sm" className="justify-self-start" disabled={busy} type="submit">Save correction</Button></form></details>
              </CardContent><CardFooter className="flex flex-wrap justify-between gap-3 text-[13px] text-muted-foreground"><EvidenceList evidence={item.evidence} /><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void review("decision", item.id, "reject")}>Reject</Button><Button size="sm" disabled={busy} onClick={() => void review("decision", item.id, "approve")}>Approve</Button></div></CardFooter>
            </Card>)}</div>}
          </section>
          <section className="scroll-mt-24 border-b border-border px-5 py-7 sm:px-8 lg:px-10" id="receipts" aria-labelledby="receipts-title">
            <p className={label}>REVIEW INBOX</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]" id="receipts-title">Work receipts</h2>
            {proposedReceipts.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No receipts waiting for review.</p> : <div className="mt-4 space-y-2">{proposedReceipts.map((item) => <Card key={`${item.id}:${item.outcome}:${item.verification.join("|")}:${item.remaining.join("|")}`}>
              <CardHeader><CardTitle><h3>{item.taskKey}</h3></CardTitle><CardDescription>{item.outcome}</CardDescription><CardAction><span className={label}>PROPOSED</span></CardAction></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Verification: {item.verification.length ? item.verification.join(" · ") : "Not recorded"}</p><p className="mt-2 text-sm text-muted-foreground">Remaining: {item.remaining.length ? item.remaining.join(" · ") : "None recorded"}</p>
                <details className="group mt-4 border-t border-border pt-3"><DisclosureSummary className="text-xs font-semibold">Correct this draft</DisclosureSummary><form className="mt-3 grid gap-2" onSubmit={(event) => void revise("receipt", item.id, event)}><label className="text-xs">Outcome<textarea name="outcome" className={textarea} required maxLength={3000} defaultValue={item.outcome} /></label><label className="text-xs">Verification · one per line<textarea name="verification" className={textarea} defaultValue={item.verification.join("\n")} /></label><label className="text-xs">Remaining · one per line<textarea name="remaining" className={textarea} defaultValue={item.remaining.join("\n")} /></label><Button size="sm" className="justify-self-start" disabled={busy} type="submit">Save correction</Button></form></details>
              </CardContent><CardFooter className="flex flex-wrap justify-between gap-3 text-[13px] text-muted-foreground"><EvidenceList evidence={item.evidence} /><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void review("receipt", item.id, "reject")}>Reject</Button><Button size="sm" disabled={busy} onClick={() => void review("receipt", item.id, "approve")}>Approve</Button></div></CardFooter>
            </Card>)}</div>}
          </section>
        </div>

        <aside className="min-w-0 border-t border-border lg:border-l lg:border-t-0" aria-label="Capture and policy">
          <section className="scroll-mt-24 border-b border-border px-5 py-7 sm:px-8 lg:px-9" id="capture">
            <p className={label}>CAPTURE</p><h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em]">Record as work happens.</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">A draft is not confirmed memory until you review it.</p>
            <details className="group mt-5 rounded-xl border border-border p-4"><DisclosureSummary className="text-sm font-semibold">New decision</DisclosureSummary><form className="mt-4 grid gap-3" onSubmit={(event) => void submitDecision(event)}><label className="text-xs font-semibold">Title<Input className="mt-1" required maxLength={160} value={decision.title} onChange={(event) => setDecision({ ...decision, title: event.target.value })} /></label><label className="text-xs font-semibold">Question or problem<textarea className={`${textarea} mt-1`} required maxLength={1000} rows={2} value={decision.issue} onChange={(event) => setDecision({ ...decision, issue: event.target.value })} /></label><label className="text-xs font-semibold">Choice<textarea className={`${textarea} mt-1`} required maxLength={1000} rows={2} value={decision.choice} onChange={(event) => setDecision({ ...decision, choice: event.target.value })} /></label><label className="text-xs font-semibold">Why<textarea className={`${textarea} mt-1`} required maxLength={2000} rows={3} value={decision.rationale} onChange={(event) => setDecision({ ...decision, rationale: event.target.value })} /></label><label className="text-xs font-semibold">Source reference (optional)<Input className="mt-1" maxLength={500} placeholder="docs/product/brief.md or HTTPS link" value={decision.source} onChange={(event) => setDecision({ ...decision, source: event.target.value })} /></label><select aria-label="Source type" className={textarea} value={decision.sourceKind} onChange={(event) => setDecision({ ...decision, sourceKind: event.target.value as EvidenceKind })}><option value="repo_file">Repository file</option><option value="commit">Commit URL</option><option value="pr">PR URL</option><option value="note">Note</option></select><Button disabled={busy} type="submit">Save proposed decision<ButtonEndIcon><ArrowUpRight size={15} /></ButtonEndIcon></Button></form></details>
            <details className="group mt-3 rounded-xl border border-border p-4"><DisclosureSummary className="text-sm font-semibold">New work receipt</DisclosureSummary><form className="mt-4 grid gap-3" onSubmit={(event) => void submitReceipt(event)}><label className="text-xs font-semibold">Task key<Input className="mt-1" required maxLength={120} placeholder="memory-pilot-001" value={receipt.taskKey} onChange={(event) => setReceipt({ ...receipt, taskKey: event.target.value })} /></label><label className="text-xs font-semibold">Outcome<textarea className={`${textarea} mt-1`} required maxLength={3000} rows={3} value={receipt.outcome} onChange={(event) => setReceipt({ ...receipt, outcome: event.target.value })} /></label><label className="text-xs font-semibold">Verification · one per line<textarea className={`${textarea} mt-1`} rows={2} value={receipt.verification} onChange={(event) => setReceipt({ ...receipt, verification: event.target.value })} /></label><label className="text-xs font-semibold">Remaining work · one per line<textarea className={`${textarea} mt-1`} rows={2} value={receipt.remaining} onChange={(event) => setReceipt({ ...receipt, remaining: event.target.value })} /></label><label className="text-xs font-semibold">Evidence reference (optional)<Input className="mt-1" maxLength={500} placeholder="HTTPS commit/PR link" value={receipt.source} onChange={(event) => setReceipt({ ...receipt, source: event.target.value })} /></label><select aria-label="Evidence type" className={textarea} value={receipt.sourceKind} onChange={(event) => setReceipt({ ...receipt, sourceKind: event.target.value as EvidenceKind })}><option value="commit">Commit URL</option><option value="pr">PR URL</option><option value="repo_file">Repository file</option><option value="test">Test</option><option value="note">Note</option></select><Button disabled={busy} type="submit">Save proposed receipt<ButtonEndIcon><ArrowUpRight size={15} /></ButtonEndIcon></Button></form></details>
          </section>
          <section className="scroll-mt-24 border-b border-border px-5 py-7 sm:px-8 lg:px-9" id="open-questions"><p className={label}>OPEN ITEMS</p><h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em]">Still to resolve</h2>{openQuestions.length ? <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{openQuestions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No open items in approved receipts yet.</p>}</section>
          <section className="scroll-mt-24 border-b border-border px-5 py-7 sm:px-8 lg:px-9" id="policy"><p className={label}>POLICY</p><h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em]">Personal-project boundary</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">This pilot accepts only Ken OS. Work/client project content is excluded.</p><details className="group mt-4 text-sm"><DisclosureSummary className="font-semibold">View capture rules and digest</DisclosureSummary><ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">{overview.policy.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul><p className="mt-3 break-all font-mono text-xs text-muted-foreground">SHA-256 {overview.policyDigest}</p></details></section>
          <section className="px-5 py-7 sm:px-8 lg:px-9" id="agent-capture"><p className={label}>AGENT CAPTURE</p><h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em]">Use a scoped key.</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">Create one key for the Ken OS capture command. It can read this project’s context and submit drafts, but cannot approve them.</p><Button className="mt-4" variant="outline" disabled={busy} type="button" onClick={() => void issueKey()}><KeyRound size={15} />Create / rotate key</Button>{issuedToken && <div className="mt-4 rounded-lg border border-border bg-muted p-3"><p className="text-xs font-semibold">Copy now—shown only once</p><code className="mt-2 block break-all text-xs">{issuedToken}</code><Button className="mt-3" size="sm" type="button" onClick={() => void navigator.clipboard.writeText(issuedToken).then(() => setMessage("Capture key copied.")).catch(() => setMessage("Could not copy key."))}><Copy size={14} />Copy key</Button></div>}{overview.credentials.map((key) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs" key={key.id}><span className="text-muted-foreground">Active since {new Date(key.createdAt).toLocaleDateString()}</span><Button size="sm" variant="outline" disabled={busy} type="button" onClick={() => void revokeKey(key.id)}>Revoke</Button></div>)}</section>
        </aside>
      </div>
    </div>
  </WorkspaceShell>;
}
