# Loona agent

Status: specification round 1 (agent-facilitated), 25 Nov 2026. Decisions below were agreed with the owner in
chat on 25 Nov 2026. Builds on the already-agreed agent infra in `agents-infrastructure.md` (chat-based
tasking, multi-turn, synchronous chat, trigger.dev for scheduled scans and writes, in-app notifications,
results in both chat and status log).

## The idea in one line

A simplified Loona, chat-only: track contacts, create loans, record payments, and get notified about loans
due or overdue today — nothing else carries over from the current standalone Loona app.

## Where this came from

Current Loona (`~/Desktop/ken.dev/loona`, a separate TanStack Start app) already has an AI chat assistant
called **Luna** — read tools (`get_overdue_loans`, `search_loans`, `search_contacts`,
`get_portfolio_overview`, ...), one write tool (`prepare_payment`/`confirm_payment`), inline "context cards"
for structured results (`loan_detail`, `overdue_loans_table`, `payment_confirmation`, ...), and cron jobs
(`overdue-alerts`, `overdue`, `daily-summary`, `digest`, `agent-weekly-summary`). This is close to a working
prototype of the Ken OS agent — its tool-registry and context-card patterns are a strong reference for the
Ken OS rebuild, even though the stack differs (TanStack Start → Next.js, cron → trigger.dev).

## Decisions

| Question                                                | Decision                                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Contacts                                                | Full name, email, phone, and a payout destination (GCash number or bank account) — "send the loan here."                                      |
| Loan creation                                           | Needs term, interest, reason, due date(s). Two shapes: single lump-sum at a specific date, or multiple monthly installments.                  |
| Loan estimator                                          | Carries over — preview the computed total/schedule before creating the loan.                                                                  |
| Recording a payment                                     | Method (GCash vs cash) doesn't matter — same flow either way.                                                                                 |
| Lender's own receiving accounts                         | Store the lender's own QR/bank/GCash separately from a contact's payout info — this is where borrowers pay the lender back.                   |
| Agents/commission, penalties, dashboard, reports, admin | All dropped. None of it carries over.                                                                                                         |
| Browsing (loans/contacts/payments lists)                | No separate pages — chat is the sole interface. Small inline UI snippets ("context cards") when a screen genuinely needs one, not full pages. |
| Notifications                                           | Both due-today and overdue (missed) payments, matching current Loona's `overdue-alerts`.                                                      |

## What carries over from current Loona, concretely

- **Reusable pattern**: the tool-registry shape (`toolRegistry` mapping tool name → definition + execute
  function) and the context-card shape (`{ type, title, data }`) are worth porting as-is into the Ken OS
  agent, not redesigned from scratch.
- **Reusable logic to port**: loan term/interest computation (estimator), the overdue/due-today scan
  (`overdue-alerts.ts`, `overdue.ts`), and `record-payment.ts`'s prepare/confirm two-step flow (fits the
  "multi-turn, ask before acting" rule from the infra spec).
- **Not reused**: commission tools, agent-facing routes, admin routes, reports — dropped per Decisions above.

## Example flows

**Create a loan (single payment):**
"Create a loan for Jane, 10000 pesos, 10% interest, due in 30 days" → agent confirms details → chat replies
"Got it, creating it now" → trigger.dev writes it → chat shows "Loan #123 created, ₱11,000 due [date]."

**Create a loan (installments):**
"Create a loan for Mark, 15000, 5% a month, 3 months" → agent computes 3 monthly payments → confirms → creates.

**Record a payment:**
"Jane paid 5000 via GCash" → agent matches it to Jane's loan, confirms, records it. Cash would be identical.

**Notification, due or overdue:**
Daily trigger.dev scan finds a loan due today or overdue → in-app notification, unprompted — matches the
infra spec's agreed notification rule.

## Parked questions

None carried over from this round — all raised questions were answered. (See `agents-infrastructure.md` for
the infra-level parked items: email notifications, later.)

## Candidate vocabulary

- **Luna**: current Loona's existing chat assistant — name/prior art for the Ken OS agent, not necessarily
  the name to keep.
- **Context card**: Luna's existing pattern for a small inline UI snippet in chat (a table, a loan summary) —
  reused concept for "small UI snippets when needed."
- **Payout destination**: a contact's GCash/bank info — where loan funds get disbursed to them.
- **Receiving account**: the lender's own GCash/bank/QR — where borrowers send repayment.

## Delivery slices (story-splitting, 25 Nov 2026)

Split from this spec plus `agents-infrastructure.md`, both rule-dominated. The parent — "owner manages loans,
contacts and payments through a chat agent in Ken OS, with due/overdue notifications" — is too large for one
PR: it bundles a new nav section, a synchronous multi-turn chat UI, LLM tool-calling, trigger.dev (new to
this codebase), and a loan/contact/payment domain with two loan shapes and two notification types. Split
into small vertical slices below, each independently shippable.

### Recommended first slice

**Owner can add a contact via chat in the new Agents → Loona section, and see it confirmed in the chat
thread and logged in the status area.**

Why first: it's the narrowest real domain action (a contact — no interest computation, no loan shapes) that
still forces every new architectural piece to exist at once — the Agents nav section, the chat UI, a
synchronous LLM call, a tool-calling write that goes through trigger.dev (unproven in this codebase so far),
and the chat+status dual result display, including the failure path (e.g. a duplicate phone number). Every
later slice reuses this proven skeleton instead of re-deriving it.

### Split candidates

| Slice                                                   | Value                                                                                                             | Includes                                                                                                                                | Defers                                                                                   | Acceptance examples                                                                                                                                       | Release constraint |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1. Add a contact via chat                               | Proves the whole chain end to end with the simplest possible domain write                                         | Agents nav shell, chat UI, sync LLM call, one tool (`create_contact`) → trigger.dev write, result in chat + status, success and failure | Multi-turn follow-ups (assumes complete info in one message), every loan/payment concept | "Add Jane, jane@x.com, 09171234567, GCash 09171234567" → chat: "Contact added" + status log entry. Duplicate phone → chat + status both show the failure. | Shippable          |
| 2. Create a single-payment loan for an existing contact | First loan write — proves term/interest/due-date handling and the estimator math in a real write                  | `create_loan` tool, single lump-sum shape only, complete info in one message                                                            | Installments, multi-turn, notifications                                                  | "Create a loan for Jane, 10000, 10% interest, due in 30 days" → chat: "Loan #123 created, ₱11,000 due [date]" + status log.                               | Shippable          |
| 3. Agent asks follow-up questions when info is missing  | Makes it actually feel like an agent, not a strict command parser — the alternate path to slices 1-2's happy path | Multi-turn state across a conversation, applied to contact and loan creation                                                            | New domain actions                                                                       | "Create a loan" (nothing else) → agent asks "who's it for, how much, what term?" → waits → creates once complete.                                         | Shippable          |
| 4. Record a payment via chat                            | Core loop closes: create a loan, then pay it down                                                                 | `record_payment` tool, method-agnostic (GCash/cash)                                                                                     | Partial-payment edge cases beyond what's needed to mark progress                         | "Jane paid 5000" → agent matches her loan, confirms, records it; chat + status both show it.                                                              | Shippable          |
| 5. Due-today notification                               | First read-only trigger.dev scheduled job + the agent-initiated (not user-initiated) notification path            | Daily scan for loans due today, in-app notification                                                                                     | Overdue (missed) loans, email                                                            | A loan due today → in-app notification appears unprompted, no chat message needed to trigger it.                                                          | Shippable          |
| 6. Overdue notification                                 | Extends slice 5's scan to missed payments, matching current Loona's `overdue-alerts`                              | Overdue scan added to the same scheduled job                                                                                            | Email                                                                                    | A loan 3 days past due → in-app notification, same as due-today.                                                                                          | Shippable          |
| 7. Installment loan shape                               | Second loan shape, reuses slice 2's write path                                                                    | Multi-month installment schedule computation + creation                                                                                 | Changing an existing loan's schedule after creation                                      | "Create a loan for Mark, 15000, 5% a month, 3 months" → 3 monthly payments computed and created.                                                          | Shippable          |
| 8. Loan estimator (preview, no write)                   | Lets the owner sanity-check a loan before committing — pure computation, no trigger.dev write                     | `estimate_loan` read-only tool, both shapes                                                                                             | —                                                                                        | "What would 20000 at 8% over 2 months look like?" → chat shows the computed total/schedule, nothing is created.                                           | Shippable          |
| 9. Lender's own receiving accounts                      | Settings-style capability, no dependency on the rest                                                              | Store/update the lender's own GCash/bank/QR                                                                                             | —                                                                                        | "My GCash is 09170000000" → stored, retrievable later (e.g. to show a borrower where to pay).                                                             | Shippable          |

### Parking lot

- **Luna→Ken OS naming**: whether the agent keeps the "Luna"/"Loona" name inside Ken OS, or gets a different
  one — not a splitting concern, revisit when the UI actually needs a label.
- **Porting vs rebuilding**: current Loona's `toolRegistry` and context-card code (TanStack Start) is a
  reference, not a drop-in import — each slice above still writes its own Next.js version of the pattern.
- Email notifications remain parked per `agents-infrastructure.md` — no slice above includes them.

### Warnings

- **New risk surface**: multi-turn LLM tool-calling and trigger.dev are both new to this codebase (today's
  `packages/agents` only has one-shot functions, no conversation state, no trigger.dev usage anywhere). Slice
  1 is deliberately the cheapest possible proof of this combination — don't skip ahead to slice 2+ before it
  actually works end to end.
- **Hard dependency**: a loan needs an existing contact, so slice 2 depends on slice 1 shipping first, not
  just being designed.
- **Don't bundle the nav shell as its own story** — it has no value with nothing behind it; it's correctly
  folded into slice 1 above, not split out.

### Next step

Slice 1 is ready for `planning` as-is. Optionally run `find-gaps` on slice 1 first if its acceptance examples
feel thin once you look at it again — otherwise go straight to planning it.
