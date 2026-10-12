import assert from "node:assert/strict";
import { test } from "node:test";
import { finalizeSourcePacket, isPacketUsable, researchTargetFor, type ResearchDraft } from "@ken-os/domain";
import { findTopic, topicMap } from "./curriculum";

const target = researchTargetFor(findTopic("js.event_loop")!);
const now = new Date("2026-10-01T12:00:00Z");
const mdn = "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop";

function draft(overrides: Partial<ResearchDraft> = {}): ResearchDraft {
  return {
    sources: [
      { title: "The event loop", url: mdn, tier: "official_docs", whyItMatters: "Defines tasks and microtasks." },
    ],
    claims: [{ statement: "Microtasks run before the next task.", sourceUrl: mdn }],
    misconceptionsToAddress: ["setTimeout(fn, 0) runs before promise callbacks"],
    openQuestions: [],
    ...overrides,
  };
}

test("keeps allowlisted sources and stamps dates in code", () => {
  const packet = finalizeSourcePacket(target, draft(), now);
  assert.equal(packet.sourceCheckedAt, "2026-10-01");
  assert.equal(packet.sources[0].retrievedAt, "2026-10-01");
  assert.equal(packet.refreshAfter, "2027-03-30");
  assert.deepEqual(packet.rejected, []);
  assert.ok(isPacketUsable(packet));
});

test("rejects sources outside the allowlist and claims that point at them", () => {
  const blog = "https://some-blog.example.com/event-loop";
  const packet = finalizeSourcePacket(
    target,
    draft({
      sources: [{ title: "Blog", url: blog, tier: "community", whyItMatters: "x" }],
      claims: [{ statement: "Timers run first.", sourceUrl: blog }],
    }),
    now,
  );
  assert.equal(packet.sources.length, 0);
  assert.equal(packet.claims.length, 0);
  assert.equal(packet.rejected.length, 2);
  assert.equal(isPacketUsable(packet), false);
});

test("rejects lookalike hosts, plain http, and claims citing an unlisted page", () => {
  const packet = finalizeSourcePacket(
    target,
    draft({
      sources: [
        { title: "Fake", url: "https://developer.mozilla.org.evil.test/x", tier: "official_docs", whyItMatters: "x" },
        { title: "Plain", url: "http://nodejs.org/en/learn", tier: "official_docs", whyItMatters: "x" },
        { title: "MDN", url: `${mdn}#event_loop?utm_source=x`, tier: "official_docs", whyItMatters: "x" },
      ],
      claims: [
        { statement: "Backed.", sourceUrl: mdn },
        {
          statement: "Unlisted page.",
          sourceUrl: "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick",
        },
      ],
    }),
    now,
  );
  assert.deepEqual(
    packet.sources.map((source) => source.title),
    ["MDN"],
  );
  assert.deepEqual(
    packet.claims.map((claim) => claim.statement),
    ["Backed."],
  );
  assert.equal(packet.rejected.length, 3);
});

test("caps a packet at five sources", () => {
  const sources = Array.from({ length: 7 }, (_, index) => ({
    title: `Page ${index}`,
    url: `https://developer.mozilla.org/page-${index}`,
    tier: "official_docs" as const,
    whyItMatters: "x",
  }));
  const packet = finalizeSourcePacket(target, draft({ sources, claims: [] }), now);
  assert.equal(packet.sources.length, 5);
  assert.equal(packet.rejected.length, 2);
});

test("every topic resolves to a research target with an allowlist", () => {
  for (const topic of topicMap.topics) {
    const item = researchTargetFor(topic);
    assert.equal(item.topicId, topic.id);
    assert.ok(item.allowedDomains.length > 0 && new Set(item.allowedDomains).size === item.allowedDomains.length);
  }
});
