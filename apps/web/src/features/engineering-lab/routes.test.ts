import assert from "node:assert/strict";
import { test } from "node:test";
import { engineering, engineeringRedirects, tabForPath } from "./routes";

// Engineering's addresses (docs/architecture/engineering-claude-first.md, sections 1 and 8).

test("Engineering is one page, and a topic opens in it", () => {
  assert.equal(engineering.roadmap(), "/engineering");
  assert.equal(engineering.roadmap("react.effects"), "/engineering?topic=react.effects");
  assert.equal(tabForPath("/engineering"), "roadmap");
});

/** Applies the redirects the way Next.js does: the first matching source wins. */
function land(path: string) {
  for (const rule of engineeringRedirects) {
    const pattern = new RegExp(`^${rule.source.replace(/:(\w+)\+/g, "(?<$1>.+)").replace(/:(\w+)/g, "(?<$1>[^/]+)")}$`);
    const match = pattern.exec(path);
    if (match) return rule.destination.replace(/:(\w+)/g, (_, name: string) => match.groups![name]);
  }
  return path;
}

test("old Engineering and /lab pages land on the roadmap, topics on their panel", () => {
  assert.equal(land("/engineering"), "/engineering", "the page itself never redirects");
  assert.equal(land("/engineering/roadmap"), "/engineering");
  assert.equal(land("/engineering/learn/js.event_loop"), "/engineering?topic=js.event_loop");
  assert.equal(land("/engineering/learn"), "/engineering");
  assert.equal(land("/engineering/practice"), "/engineering");
  assert.equal(land("/engineering/profile/assessment/a1/results"), "/engineering");
  assert.equal(land("/lab"), "/engineering");
  assert.equal(land("/lab/topics/js.closures"), "/engineering?topic=js.closures");
  assert.equal(land("/lab/profile"), "/engineering");
  assert.ok(
    engineeringRedirects.every((rule) => rule.permanent),
    "permanent, as the owner decided",
  );
});

test("each roadmap has its own address, and a topic opens on it", () => {
  assert.equal(engineering.roadmap(null, "rm-1"), "/engineering?roadmap=rm-1");
  assert.equal(engineering.roadmap("react.effects", "rm-1"), "/engineering?roadmap=rm-1&topic=react.effects");
  assert.equal(
    engineering.roadmap("react.effects", null),
    "/engineering?topic=react.effects",
    "the role's path has none",
  );
});
