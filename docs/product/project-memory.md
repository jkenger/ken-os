# Project Memory — product spec

Status: Ken OS pilot implemented locally; hosted release and owner verification are tracked separately. The owner-only `/memory` workspace stores proposed decisions and receipts, supports review, and derives a source-linked handoff. It does not import sessions or capture automatically.

## Problem and outcome

Important project context currently lives in the owner's head, scattered agent conversations, and occasional repository `docs/` files. A new session, model, or tool can inspect code but cannot reliably recover why a choice was made. Commits and PRs describe changes unevenly, and an interrupted session may leave no handoff at all.

The owner should be able to start work in a new agent session and recover the project's **current decisions, their reasons, open questions, and recent outcomes** without rereading old conversations. Ken OS should collect concise, evidence-linked work receipts as work happens, allow the owner to correct or approve consequential claims, and later turn confirmed material into a private devlog draft. It is not a transcript warehouse.

## Product principles

1. **Capture at the decision; reconcile at task end.** A final summary alone is vulnerable to interruption and context loss.
2. **Preserve provenance.** Distinguish an explicit user decision, an agent's in-scope implementation choice, observed code evidence, and an inference. File changes do not prove intent.
3. **No silent authority.** The owner decides product intent, consequential tradeoffs, and whether a private receipt becomes publishable. Agents may record technical choices within their assigned task, subject to review.
4. **Portable, not session-bound.** Project identity, policy version, approved decisions, and handoff state survive a change of model, tool, or conversation.
5. **Project-specific boundaries.** Ken OS is the first allowed project. A work/client repository is not imported or transmitted to this personal service by default.
6. **Small useful memory.** A decision or receipt should answer a future question; routine file churn need not become a new memory item.

## Core objects

- **Project:** A private workspace with a stable Ken OS ID, display name, repository identity when applicable, data-sharing setting, and current policy version. Repository URLs are identifiers, not proof of authorization to read or transmit content.
- **Memory policy:** Versioned rules for when to capture, required fields, evidence handling, review thresholds, and permitted destinations. A checked-in adapter points agents to this contract; the policy does not grant tools or access.
- **Decision:** A choice with problem, outcome, rationale, alternatives if discussed, decider (`owner` or `agent`), status, timestamps, and evidence. An explicit owner statement may be recorded as such; an agent reconstruction must remain labeled as an inference until confirmed.
- **Work receipt:** A concise record of a task's outcome, important changes, verification, decisions touched, remaining risks/questions, and links to source evidence. It is a handoff, not a raw transcript or an automatic claim of truth.
- **Evidence reference:** A typed pointer to a conversation/task, file and revision, commit, PR, comment, test run, or user-supplied note. It includes a locator and access/availability state. Captured excerpts, if any, are minimal and reviewed.
- **Handoff view:** A generated current-state digest derived from approved decisions and recent receipts, with explicit unresolved or unverified items. It is reproducible, not a separate source of truth.

## First slice: Ken OS pilot

1. The owner registers this Ken OS repository as the first project and reviews a versioned memory policy. Existing project docs may seed proposed decisions, but no historical conversation is assumed available and nothing is marked owner-approved by import alone.
2. At the start of a substantial coding task, the agent reads the project policy and handoff view. A trivial task may produce no receipt, according to the policy.
3. During work, the agent proposes a decision when a consequential choice is made, recording who actually chose it and the evidence available at that point. It does not impersonate the owner.
4. At completion or an explicit checkpoint, the agent submits a receipt draft. The draft may cite the current conversation and repository evidence it can actually see. It must not claim access to another tool's session.
5. Ken OS validates and deduplicates the submission, stores it as `proposed`, and shows the owner the claims, evidence, uncertainty, and any policy violations. The owner can edit, approve, reject, or leave it proposed.
6. A later session can request the project's handoff view. Approved facts are presented as decisions; unreviewed or reconstructed material is visibly provisional. Source links remain available for inspection.
7. If a session is lost, a new agent can create a recovery draft from the durable state plus accessible repository history. Missing rationale remains `unknown` until the owner supplies it.

The first implementation should support explicit capture and review. Automatic hooks may improve completeness later, but must not be the only capture mechanism.

## Initial scope and exclusions

In scope: one private project, policy and adapter export, proposed decisions and receipts, evidence links, owner review, a current handoff view, and a recovery/checkpoint workflow. Support a manually supplied commit or PR link; direct GitHub ingestion is optional for the first slice and requires a separately authorized connector.

Out of scope for the pilot: automatic access to all Codex or Claude Code history; raw transcript synchronization; indexing every repository or note; autonomous PR/commit rewriting; automatic publishing; cross-project search; a work-project data pipeline; and a background agent that makes product decisions. A future devlog workflow consumes approved memory but is not required to prove the first outcome.

## Rules and authority

| Claim or action                                      | Agent may do                            | Owner confirmation needed                                                                 |
| ---------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Record an explicit choice stated in the current task | Propose with a conversation reference   | To mark as owner-approved in Ken OS                                                       |
| Choose an in-scope implementation detail             | Record itself as decider with rationale | When the choice changes product scope, security, cost, data sharing, or external behavior |
| Infer intent from a diff, commit, or PR              | Suggest with `inferred` provenance      | Before promoting it to a confirmed decision                                               |
| Edit or enrich a commit/PR                           | Never as a side effect of capture       | Separate authorization and review                                                         |
| Publish a devlog                                     | Draft from approved material            | Explicit publish approval                                                                 |

No rule file can guarantee an agent will execute a workflow, and no skill grants access to sessions or services. Completeness is measured and surfaced; it is not assumed.

## Acceptance criteria

1. A fresh session or different model can identify the Ken OS project's current approved decisions and open questions without the prior conversation.
2. A receipt records outcome, verification, remaining work, and at least one relevant evidence reference when evidence exists. Claims without support are marked `unverified`, not silently omitted or stated as fact.
3. A substantive decision made before an interrupted session remains recoverable if it was checkpointed; otherwise the recovery flow clearly reports the gap.
4. A commit or PR with no recorded rationale can be linked as change evidence, but cannot be promoted into an owner decision without confirmation.
5. Two submissions of the same receipt do not create duplicate approved history. Corrections retain the prior version and attribution.
6. A project without explicit personal-data authorization cannot submit content to hosted Ken OS. A tool or model switch does not expand permissions.
7. The owner can see which policy version and source references were used for a receipt and can reject a proposed item without deleting the evidence trail.
8. The pilot can answer “why did we choose this?” for at least one confirmed Ken OS decision and can say “we do not know” for an unsupported one.

## Success measures and follow-ons

For the pilot, measure coverage of consequential decisions across several real tasks, time to orient a fresh session, owner correction rate, and missed checkpoints after interruptions. Quality matters more than receipt volume. An explicit Codex CLI adapter now exists, but reliability across real tasks has not been measured. The next likely slices are a Claude Code adapter, authorized GitHub enrichment, cross-project discovery, and private devlog drafting. Each requires separate privacy and reliability validation.

## Open product decisions

- How often should the owner review: every proposed receipt, only consequential decisions, or a daily inbox? Start with every proposed receipt for the single-project pilot.
- Which project categories may send content to hosted Ken OS? Start with an explicit personal-project allowlist; work/client projects are excluded.
- Should an approved receipt be editable in place? Proposed answer: no; use attributable revisions so a later agent can see corrections.
