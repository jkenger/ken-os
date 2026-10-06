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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type Overview = Awaited<ReturnType<typeof getMemoryOverview>>;
const label = "text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground";

async function mutate(path: string, body: unknown, method = "POST") {
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as { error?: string; token?: string };
  if (!response.ok) throw new Error(result.error ?? "Couldn't save. Try again");
  return result;
}

function EvidenceList({ evidence }: { evidence: { kind: string; locator: string; relation: string; availability: string }[] }) {
  if (!evidence.length) return <span>No source · check before approving</span>;
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
    `Drafts not yet approved: ${proposedDecisions.length} decisions, ${proposedReceipts.length} work logs`,
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
      setMessage("Decision saved as draft");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't save. Try again"); }
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
      setMessage("Work log saved as draft");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't save. Try again"); }
    finally { setBusy(false); }
  }

  async function review(kind: "decision" | "receipt", id: string, action: "approve" | "reject") {
    setBusy(true); setMessage("");
    try {
      await mutate("/api/memory/review", { kind, id, action });
      setMessage(`${kind === "decision" ? "Decision" : "Work log"} ${action === "approve" ? "approved" : "rejected"}`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't save the review. Try again"); }
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
      setMessage("Correction saved · still a draft");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't save. Try again"); }
    finally { setBusy(false); }
  }

  async function issueKey() {
    setBusy(true); setMessage("");
    try {
      const result = await mutate("/api/memory/credentials", {});
      setIssuedToken(result.token ?? "");
      setMessage("Agent key created. Old key revoked. Copy it now");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't create key. Try again"); }
    finally { setBusy(false); }
  }

  async function revokeKey(id: string) {
    setBusy(true); setMessage("");
    try {
      await mutate("/api/memory/credentials", { id }, "DELETE");
      setIssuedToken(""); setMessage("Agent key revoked"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't revoke. Try again"); }
    finally { setBusy(false); }
  }

  return <WorkspaceShell email={email} active="memory">
    <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1320px] pb-8">
      <header className="px-5 pb-2 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="text-[30px] font-[750] leading-[1.1] tracking-[-0.035em] md:text-[34px] xl:text-[40px] xl:leading-[1.05]">Project Memory</h1>
          <Button type="button" onClick={() => void navigator.clipboard.writeText(handoffText).then(() => setMessage("Handoff copied")).catch(() => setMessage("Couldn't copy. Try again"))}>Copy handoff<ButtonEndIcon><Copy size={15} /></ButtonEndIcon></Button>
        </div>
        {message && <p className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm" role="status">{message}</p>}
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
        <div className="min-w-0">
          <section className="scroll-mt-24 px-5 py-6 sm:px-8 lg:px-10" id="handoff" aria-labelledby="handoff-title">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em]" id="handoff-title">Handoff</h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">Approved items only</p>
            {approvedDecisions.length === 0 && approvedReceipts.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground"><p className="font-semibold text-foreground">Nothing approved yet</p><p className="mt-1">Approve a decision or work log below</p></div> : <div className="mt-5 space-y-3">
              {approvedDecisions.map((item) => <Card key={item.id}><CardHeader><CardTitle><h3>{item.title}</h3></CardTitle><CardDescription>{item.choice}</CardDescription><CardAction><span className={label}>Approved</span></CardAction></CardHeader><CardContent><p className="text-sm leading-5 text-muted-foreground">Why: {item.rationale}</p></CardContent><CardFooter className="text-[13px] text-muted-foreground"><EvidenceList evidence={item.evidence} /></CardFooter></Card>)}
              {approvedReceipts.slice(0, 5).map((item) => <Card key={item.id}><CardHeader><CardTitle><h3>Work log · {item.taskKey}</h3></CardTitle><CardDescription>{item.outcome}</CardDescription><CardAction><span className={label}>Approved</span></CardAction></CardHeader><CardContent><p className="text-sm text-muted-foreground">Verified: {item.verification.length ? item.verification.join(" · ") : "Not verified"}</p></CardContent><CardFooter className="text-[13px] text-muted-foreground"><EvidenceList evidence={item.evidence} /></CardFooter></Card>)}
            </div>}
          </section>
          <section className="scroll-mt-24 px-5 py-6 sm:px-8 lg:px-10" id="decisions" aria-labelledby="decisions-title">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em]" id="decisions-title">Draft decisions</h2>
            {proposedDecisions.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No drafts</p> : <div className="mt-4 space-y-2">{proposedDecisions.map((item) => <Card key={`${item.id}:${item.updatedAt}`}>
              <CardHeader><CardTitle><h3>{item.title}</h3></CardTitle><CardDescription>{item.choice}</CardDescription><CardAction><span className={label}>{item.provenance.replaceAll("_", " ")}</span></CardAction></CardHeader>
              <CardContent><p className="text-sm leading-5 text-muted-foreground">Issue: {item.issue}</p><p className="mt-2 text-sm leading-5 text-muted-foreground">Why: {item.rationale}</p>{item.alternatives.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Alternatives: {item.alternatives.join(" · ")}</p>}
                <details className="group mt-4 border-t border-border pt-3"><DisclosureSummary className="text-xs font-semibold">Edit draft</DisclosureSummary><form className="mt-3 grid gap-2" onSubmit={(event) => void revise("decision", item.id, event)}><Label className="block text-xs">Title<Input name="title" required maxLength={160} defaultValue={item.title} /></Label><Label className="block text-xs">Issue<Textarea name="issue" required maxLength={1000} defaultValue={item.issue} /></Label><Label className="block text-xs">Choice<Textarea name="choice" required maxLength={1000} defaultValue={item.choice} /></Label><Label className="block text-xs">Rationale<Textarea name="rationale" required maxLength={2000} defaultValue={item.rationale} /></Label><Label className="block text-xs">Alternatives · one per line<Textarea name="alternatives" defaultValue={item.alternatives.join("\n")} /></Label><Button size="sm" className="justify-self-start" disabled={busy} type="submit">Save</Button></form></details>
              </CardContent><CardFooter className="flex flex-wrap justify-between gap-3 text-[13px] text-muted-foreground"><EvidenceList evidence={item.evidence} /><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void review("decision", item.id, "reject")}>Reject</Button><Button size="sm" disabled={busy} onClick={() => void review("decision", item.id, "approve")}>Approve</Button></div></CardFooter>
            </Card>)}</div>}
          </section>
          <section className="scroll-mt-24 px-5 py-6 sm:px-8 lg:px-10" id="receipts" aria-labelledby="receipts-title">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em]" id="receipts-title">Draft work logs</h2>
            {proposedReceipts.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No drafts</p> : <div className="mt-4 space-y-2">{proposedReceipts.map((item) => <Card key={`${item.id}:${item.outcome}:${item.verification.join("|")}:${item.remaining.join("|")}`}>
              <CardHeader><CardTitle><h3>{item.taskKey}</h3></CardTitle><CardDescription>{item.outcome}</CardDescription><CardAction><span className={label}>Draft</span></CardAction></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Verification: {item.verification.length ? item.verification.join(" · ") : "Not recorded"}</p><p className="mt-2 text-sm text-muted-foreground">Remaining: {item.remaining.length ? item.remaining.join(" · ") : "None recorded"}</p>
                <details className="group mt-4 border-t border-border pt-3"><DisclosureSummary className="text-xs font-semibold">Edit draft</DisclosureSummary><form className="mt-3 grid gap-2" onSubmit={(event) => void revise("receipt", item.id, event)}><Label className="block text-xs">Outcome<Textarea name="outcome" required maxLength={3000} defaultValue={item.outcome} /></Label><Label className="block text-xs">Verification · one per line<Textarea name="verification" defaultValue={item.verification.join("\n")} /></Label><Label className="block text-xs">Remaining · one per line<Textarea name="remaining" defaultValue={item.remaining.join("\n")} /></Label><Button size="sm" className="justify-self-start" disabled={busy} type="submit">Save</Button></form></details>
              </CardContent><CardFooter className="flex flex-wrap justify-between gap-3 text-[13px] text-muted-foreground"><EvidenceList evidence={item.evidence} /><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void review("receipt", item.id, "reject")}>Reject</Button><Button size="sm" disabled={busy} onClick={() => void review("receipt", item.id, "approve")}>Approve</Button></div></CardFooter>
            </Card>)}</div>}
          </section>
        </div>

        <aside className="min-w-0" aria-label="New entry and settings">
          <section className="scroll-mt-24 px-5 py-6 sm:px-8 lg:px-9" id="capture">
            <h2 className="font-display text-xl font-semibold tracking-[-0.04em]">New entry</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">Saved as a draft</p>
            <details className="group mt-5 rounded-xl bg-card shadow-panel p-4"><DisclosureSummary className="text-sm font-semibold">New decision</DisclosureSummary><form className="mt-4 grid gap-3" onSubmit={(event) => void submitDecision(event)}><Label className="block text-xs font-semibold">Title<Input className="mt-1" required maxLength={160} value={decision.title} onChange={(event) => setDecision({ ...decision, title: event.target.value })} /></Label><Label className="block text-xs font-semibold">Question or problem<Textarea className="mt-1" required maxLength={1000} rows={2} value={decision.issue} onChange={(event) => setDecision({ ...decision, issue: event.target.value })} /></Label><Label className="block text-xs font-semibold">Choice<Textarea className="mt-1" required maxLength={1000} rows={2} value={decision.choice} onChange={(event) => setDecision({ ...decision, choice: event.target.value })} /></Label><Label className="block text-xs font-semibold">Why<Textarea className="mt-1" required maxLength={2000} rows={3} value={decision.rationale} onChange={(event) => setDecision({ ...decision, rationale: event.target.value })} /></Label><Label className="block text-xs font-semibold">Source (optional)<Input className="mt-1" maxLength={500} placeholder="docs/product/brief.md or HTTPS link" value={decision.source} onChange={(event) => setDecision({ ...decision, source: event.target.value })} /></Label><NativeSelect aria-label="Source type" className="w-full" value={decision.sourceKind} onChange={(event) => setDecision({ ...decision, sourceKind: event.target.value as EvidenceKind })}><NativeSelectOption value="repo_file">Repository file</NativeSelectOption><NativeSelectOption value="commit">Commit URL</NativeSelectOption><NativeSelectOption value="pr">PR URL</NativeSelectOption><NativeSelectOption value="note">Note</NativeSelectOption></NativeSelect><Button disabled={busy} type="submit">Save draft<ButtonEndIcon><ArrowUpRight size={15} /></ButtonEndIcon></Button></form></details>
            <details className="group mt-3 rounded-xl bg-card shadow-panel p-4"><DisclosureSummary className="text-sm font-semibold">New work log</DisclosureSummary><form className="mt-4 grid gap-3" onSubmit={(event) => void submitReceipt(event)}><Label className="block text-xs font-semibold">Task key<Input className="mt-1" required maxLength={120} placeholder="memory-pilot-001" value={receipt.taskKey} onChange={(event) => setReceipt({ ...receipt, taskKey: event.target.value })} /></Label><Label className="block text-xs font-semibold">Outcome<Textarea className="mt-1" required maxLength={3000} rows={3} value={receipt.outcome} onChange={(event) => setReceipt({ ...receipt, outcome: event.target.value })} /></Label><Label className="block text-xs font-semibold">Verification · one per line<Textarea className="mt-1" rows={2} value={receipt.verification} onChange={(event) => setReceipt({ ...receipt, verification: event.target.value })} /></Label><Label className="block text-xs font-semibold">Remaining work · one per line<Textarea className="mt-1" rows={2} value={receipt.remaining} onChange={(event) => setReceipt({ ...receipt, remaining: event.target.value })} /></Label><Label className="block text-xs font-semibold">Evidence (optional)<Input className="mt-1" maxLength={500} placeholder="HTTPS commit/PR link" value={receipt.source} onChange={(event) => setReceipt({ ...receipt, source: event.target.value })} /></Label><NativeSelect aria-label="Evidence type" className="w-full" value={receipt.sourceKind} onChange={(event) => setReceipt({ ...receipt, sourceKind: event.target.value as EvidenceKind })}><NativeSelectOption value="commit">Commit URL</NativeSelectOption><NativeSelectOption value="pr">PR URL</NativeSelectOption><NativeSelectOption value="repo_file">Repository file</NativeSelectOption><NativeSelectOption value="test">Test</NativeSelectOption><NativeSelectOption value="note">Note</NativeSelectOption></NativeSelect><Button disabled={busy} type="submit">Save draft<ButtonEndIcon><ArrowUpRight size={15} /></ButtonEndIcon></Button></form></details>
          </section>
          <section className="scroll-mt-24 px-5 py-6 sm:px-8 lg:px-9" id="open-questions"><h2 className="font-display text-xl font-semibold tracking-[-0.04em]">Open items</h2>{openQuestions.length ? <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{openQuestions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">None open</p>}</section>
          <section className="scroll-mt-24 px-5 py-6 sm:px-8 lg:px-9" id="policy"><h2 className="font-display text-xl font-semibold tracking-[-0.04em]">Policy</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">Ken OS only · no work or client content</p><details className="group mt-4 text-sm"><DisclosureSummary className="font-semibold">Capture rules</DisclosureSummary><ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">{overview.policy.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul><p className="mt-3 break-all font-mono text-xs text-muted-foreground">SHA-256 {overview.policyDigest}</p></details></section>
          <section className="px-5 py-7 sm:px-8 lg:px-9" id="agent-capture"><h2 className="font-display text-xl font-semibold tracking-[-0.04em]">Agent key</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">Lets an agent read approved context and send drafts. It can&apos;t approve</p><Button className="mt-4" variant="outline" disabled={busy} type="button" onClick={() => void issueKey()}><KeyRound size={15} />{overview.credentials.length ? "Replace key" : "Create key"}</Button>{issuedToken && <div className="mt-4 rounded-lg border border-border bg-muted p-3"><p className="text-xs font-semibold">Copy now. Shown once</p><code className="mt-2 block break-all text-xs">{issuedToken}</code><Button className="mt-3" size="sm" type="button" onClick={() => void navigator.clipboard.writeText(issuedToken).then(() => setMessage("Key copied")).catch(() => setMessage("Couldn't copy. Try again"))}><Copy size={14} />Copy key</Button></div>}{overview.credentials.map((key) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs" key={key.id}><span className="text-muted-foreground">Active since {new Date(key.createdAt).toLocaleDateString()}</span><Button size="sm" variant="outline" disabled={busy} type="button" onClick={() => void revokeKey(key.id)}>Revoke</Button></div>)}</section>
        </aside>
      </div>
    </div>
  </WorkspaceShell>;
}
