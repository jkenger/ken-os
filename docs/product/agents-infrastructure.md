# Agents

Status: specification round 1 (agent-facilitated), 25 Nov 2026. Decisions below were agreed with the owner in
chat on 25 Nov 2026. Loona's own feature set is explicitly out of scope here — see Parked questions.

## The idea in one line

Ken OS gets a new top-level "Agents" section. Loona is its first entry: a background automation you can chat
with (type an instruction, it asks follow-up questions if something's missing, then acts), and that also acts
on its own on a schedule (e.g. notices a loan is due today and tells you, unprompted).

## Decisions

| Question                    | Decision                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What is an "agent" here     | A background automation with status/monitoring, that takes input (you task it) and produces output (it notifies you) — not a hardcoded chat-only concept.                                                                      |
| How you task it             | Free text, not a form. "Create a loan for X" rather than filling fields.                                                                                                                                                       |
| Missing information         | Multi-turn: the agent asks follow-up questions ("who's it for, how much?") and waits, rather than failing and making you retype everything.                                                                                    |
| Chat turns                  | Synchronous — a normal request/response in the Ken OS app, not queued.                                                                                                                                                         |
| Scheduled checks and writes | trigger.dev — it owns the daily/periodic scans (e.g. "any loan due today") and the actual mutating writes (e.g. the real create-loan).                                                                                         |
| Acting on a decision        | Fire-and-forget from the chat's side: chat replies immediately ("Got it, creating it now"), the trigger.dev job runs after, result follows later.                                                                              |
| Where results show up       | Both places: the chat thread gets a follow-up message, and the status/activity log records the same event — for success and for failure.                                                                                       |
| Notifications               | In-app only for now (e.g. loan due today). Email is a later addition, not v1.                                                                                                                                                  |
| Infrastructure now vs later | Build Loona concretely first. "The infrastructure" is whatever turns out reusable afterward (chat UI, status log, trigger.dev wiring) — no formal agent plugin/registry system until a second agent exists to prove the shape. |
| Where it lives in Ken OS    | New top-level nav section, "Agents," sibling to Jobs / Engineering Lab. Loona is the first entry inside it.                                                                                                                    |

## Example flows

**Scheduled, agent-initiated:**
A loan is due today → trigger.dev's scheduled scan finds it → an in-app notification appears, unprompted,
nobody asked for it that day.

**User-initiated, chat:**
User types "create a loan for Jane, 5000, due in 30 days" (or leaves something out) → if something's missing,
the agent asks for it and waits → once complete, chat replies "Got it, creating it now" → trigger.dev runs the
actual write → on success, chat shows "Loan #123 created" and the status log shows the same event → on
failure, chat shows "Couldn't create the loan: [reason]" and the status log shows the failure too.

## Parked questions

| Question                                                                                                                              | Owner   | Decision by                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------- |
| Full Loona feature rescoping — current Loona has features that aren't actually used; which carry over to the Ken OS agent, which drop | jkenger | Separate specification session, before Loona agent build starts |
| Email notifications                                                                                                                   | jkenger | No date — later addition, not blocking v1                       |

## Candidate vocabulary

- **Agent** (this infra): a background automation unit with status/monitoring, that takes input (tasking, free
  text) and produces output (notifications), using an LLM to interpret free-text instructions and hold a
  multi-turn conversation — not necessarily autonomous or tool-using beyond that.
- **Agents** (nav section): the new top-level Ken OS area housing agents; Loona is the first one in it.
