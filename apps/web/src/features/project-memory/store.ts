import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import {
  memoryCredentials,
  memoryDecisionRevisions,
  memoryDecisions,
  memoryEvidence,
  memoryPolicies,
  memoryProjects,
  memoryReceiptRevisions,
  memoryReceipts,
} from "@/lib/db/schema";
import {
  type DecisionDraft,
  type DecisionRevision,
  type EvidenceDraft,
  MemoryInputError,
  type ReceiptDraft,
  type ReceiptRevision,
  PILOT_PROJECT_ID,
  pilotPolicy,
} from "./contract";

const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function ensurePilotProject(userId: string) {
  await db()
    .insert(memoryProjects)
    .values({
      id: PILOT_PROJECT_ID,
      ownerUserId: userId,
      name: "Loots",
      repository: "https://github.com/jkenger/ken-os",
      sharingMode: "personal_only",
      activePolicyVersion: pilotPolicy.version,
    })
    .onConflictDoNothing();
  const [project] = await db().select().from(memoryProjects).where(eq(memoryProjects.id, PILOT_PROJECT_ID)).limit(1);
  if (!project || project.ownerUserId !== userId || project.sharingMode !== "personal_only") {
    throw new MemoryInputError("Project access denied.", 403);
  }
  await db()
    .insert(memoryPolicies)
    .values({
      projectId: PILOT_PROJECT_ID,
      version: pilotPolicy.version,
      digest: digest(pilotPolicy),
      document: pilotPolicy as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing();
  const [storedPolicy] = await db()
    .select({ digest: memoryPolicies.digest })
    .from(memoryPolicies)
    .where(and(eq(memoryPolicies.projectId, PILOT_PROJECT_ID), eq(memoryPolicies.version, pilotPolicy.version)))
    .limit(1);
  if (!storedPolicy || storedPolicy.digest !== digest(pilotPolicy)) {
    throw new MemoryInputError("Memory policy drift detected. Review the stored policy before capture.", 409);
  }
  const seeds = [
    {
      key: "seed:resume-source-v1",
      title: "Google Drive remains the resume source",
      issue: "Where should the canonical resume live?",
      choice: "Loots tracks the exact selected Google Drive file rather than copying its content into Project Memory.",
      rationale: "The resume hub keeps the selected Drive file as the source of truth.",
      locator: "docs/product/brief.md",
    },
    {
      key: "seed:visual-baseline-v1",
      title: "One warm monochrome visual baseline",
      issue: "Which visual direction should Loots carry into reusable design guidance?",
      choice: "Use Manrope headings, Source Sans 3 body text, and a light warm monochrome palette.",
      rationale: "This is the current documented design contract; approval here would confirm it as project memory.",
      locator: "docs/design/component-language.md",
    },
  ];
  for (const seed of seeds) {
    await db().transaction(async (transaction) => {
      const id = randomUUID();
      const snapshot = {
        title: seed.title,
        issue: seed.issue,
        choice: seed.choice,
        rationale: seed.rationale,
        alternatives: [],
        provenance: "observed",
        status: "proposed",
      };
      const inserted = await transaction
        .insert(memoryDecisions)
        .values({
          id,
          projectId: PILOT_PROJECT_ID,
          taskKey: "ken-os-seed",
          idempotencyKey: seed.key,
          digest: digest(snapshot),
          title: seed.title,
          issue: seed.issue,
          choice: seed.choice,
          rationale: seed.rationale,
          alternatives: [],
          provenance: "observed",
          status: "proposed",
          policyVersion: pilotPolicy.version,
        })
        .onConflictDoNothing()
        .returning({ id: memoryDecisions.id });
      if (!inserted.length) return;
      await transaction.insert(memoryDecisionRevisions).values({
        id: randomUUID(),
        decisionId: id,
        version: 1,
        action: "seeded_from_repository",
        editor: "system",
        snapshot,
      });
      await transaction.insert(memoryEvidence).values({
        id: randomUUID(),
        projectId: PILOT_PROJECT_ID,
        subjectType: "decision",
        subjectId: id,
        kind: "repo_file",
        locator: seed.locator,
        relation: "supports",
      });
    });
  }
  return project;
}

async function insertEvidence(
  transaction: Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0],
  subjectType: "decision" | "receipt",
  subjectId: string,
  evidence: EvidenceDraft[],
) {
  if (!evidence.length) return;
  await transaction.insert(memoryEvidence).values(
    evidence.map((item) => ({
      id: randomUUID(),
      projectId: PILOT_PROJECT_ID,
      subjectType,
      subjectId,
      kind: item.kind,
      locator: item.locator,
      relation: item.relation,
    })),
  );
}

export async function submitDecision(userId: string, draft: DecisionDraft, sourceAdapter: "browser" | "cli") {
  await ensurePilotProject(userId);
  const contentDigest = digest(draft);
  return db().transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`memory:decision:${draft.idempotencyKey}`}))`,
    );
    const [existing] = await transaction
      .select({ id: memoryDecisions.id, digest: memoryDecisions.digest })
      .from(memoryDecisions)
      .where(
        and(eq(memoryDecisions.projectId, PILOT_PROJECT_ID), eq(memoryDecisions.idempotencyKey, draft.idempotencyKey)),
      )
      .limit(1);
    if (existing) {
      if (existing.digest !== contentDigest)
        throw new MemoryInputError("Idempotency key already has different content.", 409);
      return { id: existing.id, duplicate: true };
    }
    const id = randomUUID();
    const snapshot = {
      title: draft.title,
      issue: draft.issue,
      choice: draft.choice,
      rationale: draft.rationale,
      alternatives: draft.alternatives,
      provenance: draft.provenance,
      status: "proposed",
    };
    await transaction.insert(memoryDecisions).values({
      id,
      projectId: PILOT_PROJECT_ID,
      taskKey: draft.taskKey,
      idempotencyKey: draft.idempotencyKey,
      digest: contentDigest,
      title: draft.title,
      issue: draft.issue,
      choice: draft.choice,
      rationale: draft.rationale,
      alternatives: draft.alternatives,
      provenance: draft.provenance,
      status: "proposed",
      policyVersion: pilotPolicy.version,
    });
    await transaction.insert(memoryDecisionRevisions).values({
      id: randomUUID(),
      decisionId: id,
      version: 1,
      action: "proposed",
      editor: sourceAdapter === "browser" ? userId : "cli",
      snapshot,
    });
    await insertEvidence(transaction, "decision", id, draft.evidence);
    return { id, duplicate: false };
  });
}

export async function submitReceipt(userId: string, draft: ReceiptDraft, sourceAdapter: "browser" | "cli") {
  await ensurePilotProject(userId);
  const contentDigest = digest(draft);
  return db().transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`memory:receipt:${draft.idempotencyKey}`}))`);
    const [existing] = await transaction
      .select({ id: memoryReceipts.id, digest: memoryReceipts.digest })
      .from(memoryReceipts)
      .where(
        and(eq(memoryReceipts.projectId, PILOT_PROJECT_ID), eq(memoryReceipts.idempotencyKey, draft.idempotencyKey)),
      )
      .limit(1);
    if (existing) {
      if (existing.digest !== contentDigest)
        throw new MemoryInputError("Idempotency key already has different content.", 409);
      return { id: existing.id, duplicate: true };
    }
    const id = randomUUID();
    await transaction.insert(memoryReceipts).values({
      id,
      projectId: PILOT_PROJECT_ID,
      taskKey: draft.taskKey,
      idempotencyKey: draft.idempotencyKey,
      digest: contentDigest,
      outcome: draft.outcome,
      verification: draft.verification,
      remaining: draft.remaining,
      status: "proposed",
      policyVersion: draft.policyVersion,
      sourceAdapter,
    });
    await transaction.insert(memoryReceiptRevisions).values({
      id: randomUUID(),
      receiptId: id,
      version: 1,
      action: "proposed",
      editor: sourceAdapter === "browser" ? userId : "cli",
      snapshot: {
        outcome: draft.outcome,
        verification: draft.verification,
        remaining: draft.remaining,
        status: "proposed",
      },
    });
    await insertEvidence(transaction, "receipt", id, draft.evidence);
    return { id, duplicate: false };
  });
}

export async function reviewMemoryItem(
  userId: string,
  kind: "decision" | "receipt",
  id: string,
  action: "approve" | "reject",
) {
  await ensurePilotProject(userId);
  return db().transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`memory:review:${kind}:${id}`}))`);
    const status = action === "approve" ? "approved" : "rejected";
    if (kind === "decision") {
      const [item] = await transaction
        .select()
        .from(memoryDecisions)
        .where(and(eq(memoryDecisions.id, id), eq(memoryDecisions.projectId, PILOT_PROJECT_ID)))
        .limit(1);
      if (!item) throw new MemoryInputError("Decision not found.", 404);
      if (item.status !== "proposed") throw new MemoryInputError("Only proposed decisions can be reviewed.", 409);
      await transaction
        .update(memoryDecisions)
        .set({ status, updatedAt: new Date() })
        .where(eq(memoryDecisions.id, id));
      const [latest] = await transaction
        .select({ version: memoryDecisionRevisions.version })
        .from(memoryDecisionRevisions)
        .where(eq(memoryDecisionRevisions.decisionId, id))
        .orderBy(desc(memoryDecisionRevisions.version))
        .limit(1);
      await transaction.insert(memoryDecisionRevisions).values({
        id: randomUUID(),
        decisionId: id,
        version: (latest?.version ?? 0) + 1,
        action: status,
        editor: userId,
        snapshot: {
          title: item.title,
          issue: item.issue,
          choice: item.choice,
          rationale: item.rationale,
          alternatives: item.alternatives,
          provenance: item.provenance,
          status,
        },
      });
    } else {
      const [item] = await transaction
        .select()
        .from(memoryReceipts)
        .where(and(eq(memoryReceipts.id, id), eq(memoryReceipts.projectId, PILOT_PROJECT_ID)))
        .limit(1);
      if (!item) throw new MemoryInputError("Receipt not found.", 404);
      if (item.status !== "proposed") throw new MemoryInputError("Only proposed receipts can be reviewed.", 409);
      await transaction.update(memoryReceipts).set({ status, reviewedAt: new Date() }).where(eq(memoryReceipts.id, id));
      const [latest] = await transaction
        .select({ version: memoryReceiptRevisions.version })
        .from(memoryReceiptRevisions)
        .where(eq(memoryReceiptRevisions.receiptId, id))
        .orderBy(desc(memoryReceiptRevisions.version))
        .limit(1);
      await transaction.insert(memoryReceiptRevisions).values({
        id: randomUUID(),
        receiptId: id,
        version: (latest?.version ?? 0) + 1,
        action: status,
        editor: userId,
        snapshot: { outcome: item.outcome, verification: item.verification, remaining: item.remaining, status },
      });
    }
    return { id, status };
  });
}

export async function reviseMemoryItem(
  userId: string,
  kind: "decision",
  id: string,
  changes: DecisionRevision,
): Promise<{ id: string; version: number }>;
export async function reviseMemoryItem(
  userId: string,
  kind: "receipt",
  id: string,
  changes: ReceiptRevision,
): Promise<{ id: string; version: number }>;
export async function reviseMemoryItem(
  userId: string,
  kind: "decision" | "receipt",
  id: string,
  changes: DecisionRevision | ReceiptRevision,
) {
  await ensurePilotProject(userId);
  return db().transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`memory:review:${kind}:${id}`}))`);
    if (kind === "decision") {
      const [item] = await transaction
        .select()
        .from(memoryDecisions)
        .where(and(eq(memoryDecisions.id, id), eq(memoryDecisions.projectId, PILOT_PROJECT_ID)))
        .limit(1);
      if (!item) throw new MemoryInputError("Decision not found.", 404);
      if (item.status !== "proposed") throw new MemoryInputError("Only proposed decisions can be edited.", 409);
      const revision = changes as DecisionRevision;
      const [latest] = await transaction
        .select({ version: memoryDecisionRevisions.version })
        .from(memoryDecisionRevisions)
        .where(eq(memoryDecisionRevisions.decisionId, id))
        .orderBy(desc(memoryDecisionRevisions.version))
        .limit(1);
      const version = (latest?.version ?? 0) + 1;
      await transaction
        .update(memoryDecisions)
        .set({ ...revision, updatedAt: new Date() })
        .where(eq(memoryDecisions.id, id));
      await transaction.insert(memoryDecisionRevisions).values({
        id: randomUUID(),
        decisionId: id,
        version,
        action: "revised",
        editor: userId,
        snapshot: { ...revision, provenance: item.provenance, status: "proposed" },
      });
      return { id, version };
    }
    const [item] = await transaction
      .select()
      .from(memoryReceipts)
      .where(and(eq(memoryReceipts.id, id), eq(memoryReceipts.projectId, PILOT_PROJECT_ID)))
      .limit(1);
    if (!item) throw new MemoryInputError("Receipt not found.", 404);
    if (item.status !== "proposed") throw new MemoryInputError("Only proposed receipts can be edited.", 409);
    const revision = changes as ReceiptRevision;
    const [latest] = await transaction
      .select({ version: memoryReceiptRevisions.version })
      .from(memoryReceiptRevisions)
      .where(eq(memoryReceiptRevisions.receiptId, id))
      .orderBy(desc(memoryReceiptRevisions.version))
      .limit(1);
    const version = (latest?.version ?? 0) + 1;
    await transaction.update(memoryReceipts).set(revision).where(eq(memoryReceipts.id, id));
    await transaction.insert(memoryReceiptRevisions).values({
      id: randomUUID(),
      receiptId: id,
      version,
      action: "revised",
      editor: userId,
      snapshot: { ...revision, status: "proposed" },
    });
    return { id, version };
  });
}

export async function getMemoryOverview(userId: string) {
  const project = await ensurePilotProject(userId);
  const [decisions, receipts, evidence, credentials] = await Promise.all([
    db()
      .select()
      .from(memoryDecisions)
      .where(eq(memoryDecisions.projectId, PILOT_PROJECT_ID))
      .orderBy(desc(memoryDecisions.createdAt)),
    db()
      .select()
      .from(memoryReceipts)
      .where(eq(memoryReceipts.projectId, PILOT_PROJECT_ID))
      .orderBy(desc(memoryReceipts.createdAt))
      .limit(50),
    db().select().from(memoryEvidence).where(eq(memoryEvidence.projectId, PILOT_PROJECT_ID)),
    db()
      .select({
        id: memoryCredentials.id,
        createdAt: memoryCredentials.createdAt,
        lastUsedAt: memoryCredentials.lastUsedAt,
      })
      .from(memoryCredentials)
      .where(and(eq(memoryCredentials.projectId, PILOT_PROJECT_ID), isNull(memoryCredentials.revokedAt))),
  ]);
  return {
    project: {
      id: project.id,
      name: project.name,
      repository: project.repository,
      policyVersion: project.activePolicyVersion,
    },
    policy: pilotPolicy,
    policyDigest: digest(pilotPolicy),
    decisions: decisions.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      evidence: evidence
        .filter((ref) => ref.subjectType === "decision" && ref.subjectId === item.id)
        .map((ref) => ({
          kind: ref.kind,
          locator: ref.locator,
          relation: ref.relation,
          availability: ref.availability,
        })),
    })),
    receipts: receipts.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      evidence: evidence
        .filter((ref) => ref.subjectType === "receipt" && ref.subjectId === item.id)
        .map((ref) => ({
          kind: ref.kind,
          locator: ref.locator,
          relation: ref.relation,
          availability: ref.availability,
        })),
    })),
    credentials: credentials.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
    })),
  };
}

export async function issueMemoryCredential(userId: string) {
  await ensurePilotProject(userId);
  const token = `km_${randomBytes(32).toString("base64url")}`;
  const id = randomUUID();
  await db().transaction(async (transaction) => {
    await transaction
      .update(memoryCredentials)
      .set({ revokedAt: new Date() })
      .where(and(eq(memoryCredentials.projectId, PILOT_PROJECT_ID), isNull(memoryCredentials.revokedAt)));
    await transaction.insert(memoryCredentials).values({ id, projectId: PILOT_PROJECT_ID, tokenHash: digest(token) });
  });
  return { id, token };
}

export async function revokeMemoryCredential(userId: string, id: string) {
  await ensurePilotProject(userId);
  const result = await db()
    .update(memoryCredentials)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(memoryCredentials.id, id),
        eq(memoryCredentials.projectId, PILOT_PROJECT_ID),
        isNull(memoryCredentials.revokedAt),
      ),
    )
    .returning({ id: memoryCredentials.id });
  if (!result.length) throw new MemoryInputError("Active capture key not found.", 404);
}

export async function authorizeMemoryCredential(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer km_[A-Za-z0-9_-]{43}$/.test(authorization)) throw new MemoryInputError("Capture key required.", 401);
  const hash = digest(authorization.slice(7));
  return db().transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`memory:credential:${hash}`}))`);
    const [credential] = await transaction
      .select()
      .from(memoryCredentials)
      .where(
        and(
          eq(memoryCredentials.tokenHash, hash),
          eq(memoryCredentials.projectId, PILOT_PROJECT_ID),
          isNull(memoryCredentials.revokedAt),
        ),
      )
      .limit(1);
    if (!credential) throw new MemoryInputError("Capture key invalid or revoked.", 401);
    const [project] = await transaction
      .select()
      .from(memoryProjects)
      .where(eq(memoryProjects.id, credential.projectId))
      .limit(1);
    if (!project || project.sharingMode !== "personal_only") throw new MemoryInputError("Project access denied.", 403);
    const now = new Date();
    const resetWindow = now.getTime() - credential.usageWindowStartedAt.getTime() >= 60_000;
    const count = resetWindow ? 1 : credential.usageCount + 1;
    if (count > 60) throw new MemoryInputError("Capture key rate limit reached. Try again in a minute.", 429);
    await transaction
      .update(memoryCredentials)
      .set({
        lastUsedAt: now,
        usageWindowStartedAt: resetWindow ? now : credential.usageWindowStartedAt,
        usageCount: count,
      })
      .where(eq(memoryCredentials.id, credential.id));
    return project.ownerUserId;
  });
}
