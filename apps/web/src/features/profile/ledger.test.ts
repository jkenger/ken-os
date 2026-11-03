import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProfile } from "@ken-os/domain";
import { portfolioProfile } from "@/features/portfolio/snapshot";
import { isLedgerSection, ledgerRows } from "./ledger";

const hidden = { showEmail: false };

function saved() {
  const details = emptyProfile();
  details.contact = { ...details.contact, fullName: "Ken", email: "ken@example.test", links: [] };
  details.summary = "Builds things";
  details.projects = [{ name: "Loots", link: "", description: "", bullets: [] }];
  return details;
}

const stateOf = (rows: ReturnType<typeof ledgerRows>, id: string) => rows.find((row) => row.id === id)?.state;

test("sections are not published until a snapshot is live", () => {
  const details = saved();
  const rows = ledgerRows(details, details, null, portfolioProfile(details, hidden));
  assert.equal(stateOf(rows, "summary"), "not-published");
  assert.equal(stateOf(rows, "education"), "empty");
  assert.equal(stateOf(rows, "local-fields"), "empty");
  assert.equal(rows.find((row) => row.id === "contact")?.count, 2);
});

test("a live snapshot marks matching sections published, regardless of key order", () => {
  const details = saved();
  const published = JSON.parse(JSON.stringify(portfolioProfile(details, hidden)));
  published.projects = [{ bullets: [], description: "", link: "", name: "Loots" }];
  const rows = ledgerRows(details, details, published, portfolioProfile(details, hidden));
  assert.equal(stateOf(rows, "contact"), "published");
  assert.equal(stateOf(rows, "projects"), "published");
});

test("a saved change since the snapshot is Changed, an unsaved edit is Unsaved", () => {
  const before = saved();
  const published = portfolioProfile(before, hidden);
  const after = saved();
  after.summary = "Builds and ships things";
  const typed = structuredClone(after);
  typed.projects = [];
  const rows = ledgerRows(typed, after, published, portfolioProfile(after, hidden));
  assert.equal(stateOf(rows, "summary"), "changed");
  assert.equal(stateOf(rows, "projects"), "unsaved");
  assert.equal(stateOf(rows, "contact"), "published");
});

test("Show email turned on changes Contact, local fields stay private", () => {
  const details = saved();
  details.local = { ...details.local, enabled: true, nationality: "Filipino" };
  const published = portfolioProfile(details, hidden);
  const rows = ledgerRows(details, details, published, portfolioProfile(details, { showEmail: true }));
  assert.equal(stateOf(rows, "contact"), "changed");
  assert.equal(stateOf(rows, "local-fields"), "private");
});

test("a section emptied since the Publish is Changed and still counted while being edited", () => {
  const before = saved();
  const published = portfolioProfile(before, hidden);
  const after = saved();
  after.projects = [];
  const next = portfolioProfile(after, hidden);
  assert.equal(stateOf(ledgerRows(after, after, published, next), "projects"), "changed");
  const typed = structuredClone(after);
  typed.projects = [{ name: "New", link: "", description: "", bullets: [] }];
  const row = ledgerRows(typed, after, published, next).find((item) => item.id === "projects");
  assert.equal(row?.state, "unsaved");
  assert.equal(row?.publishChanges, true);
});

test("isLedgerSection accepts only section ids from the address", () => {
  assert.equal(isLedgerSection("local-fields"), true);
  assert.equal(isLedgerSection("resumes"), false);
  assert.equal(isLedgerSection(""), false);
});
