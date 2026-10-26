import assert from "node:assert/strict";
import { test } from "node:test";
import { contactLine, emptyProfile, sectionsToPrint } from "@ken-os/domain";
import { parsePortfolioSnapshot } from "@ken-os/portfolio";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import { buildSnapshot, portfolioEngineering, publishedResumeDetails } from "./snapshot";

const classic = { template: "classic", paper: "letter" } as const;
const hidden = { showEmail: false };

function fullProfile() {
  const details = emptyProfile();
  details.contact = {
    fullName: "Ken Example",
    headline: "Full-stack engineer",
    email: "ken@example.test",
    phone: "+63 900 000 0000",
    city: "Manila",
    country: "Philippines",
    links: [{ label: "GitHub", url: "https://github.com/example" }],
  };
  details.summary = "Builds things";
  details.experience = [
    { company: "Acme", title: "Engineer", location: "Remote", start: "2024-01", end: "", bullets: ["Shipped it"] },
  ];
  details.education = [{ school: "UP", degree: "BS", field: "CS", start: "2016", end: "2020", notes: "GPA 1.2" }];
  details.local = {
    enabled: true,
    birthdate: "1999-01-01",
    civilStatus: "Single",
    nationality: "Filipino",
    address: "123 Private St",
    references: ["Jane, 0917 000 0000"],
  };
  return details;
}

test("the snapshot leaves out contact details, local fields and education notes", () => {
  const snapshot = buildSnapshot(fullProfile(), classic, hidden, 1, new Date("2026-10-18T00:00:00Z"));
  const text = JSON.stringify(snapshot);
  for (const secret of ["ken@example.test", "+63 900", "123 Private St", "1999-01-01", "Filipino", "Jane", "GPA"]) {
    assert.ok(!text.includes(secret), `${secret} must not be published`);
  }
  assert.equal(snapshot.profile.location, "Manila, Philippines");
  assert.equal(snapshot.profile.experience[0].company, "Acme");
});

test("the snapshot matches the contract the portfolio site reads", () => {
  const snapshot = buildSnapshot(fullProfile(), classic, hidden, 3, new Date("2026-10-18T00:00:00Z"));
  assert.deepEqual(parsePortfolioSnapshot(JSON.parse(JSON.stringify(snapshot))), snapshot);
  assert.equal(snapshot.publication, 3);
});

test("a blank city or country leaves no stray comma", () => {
  const details = fullProfile();
  details.contact.city = "";
  assert.equal(buildSnapshot(details, classic, hidden, 1, new Date()).profile.location, "Philippines");
});

test("the snapshot carries the Resume page's template and paper", () => {
  const snapshot = buildSnapshot(fullProfile(), { template: "technical", paper: "a4" }, hidden, 1, new Date());
  assert.deepEqual(snapshot.resume, { template: "technical", paper: "a4" });
});

test("the public resume prints only what was published", () => {
  const details = publishedResumeDetails(buildSnapshot(fullProfile(), classic, hidden, 1, new Date()).profile);
  assert.deepEqual(contactLine(details), ["Manila, Philippines", "github.com/example"]);
  assert.equal(details.local.enabled, false);
  assert.equal(details.education[0].notes, "");
  assert.deepEqual(sectionsToPrint(details, "classic"), ["summary", "experience", "education"]);
});

test("Show email publishes the email, and the public resume prints it", () => {
  const snapshot = buildSnapshot(fullProfile(), classic, { showEmail: true }, 1, new Date());
  assert.equal(snapshot.profile.email, "ken@example.test");
  assert.ok(!JSON.stringify(snapshot).includes("+63 900"), "the phone stays private");
  assert.equal(contactLine(publishedResumeDetails(snapshot.profile))[0], "ken@example.test");
});

function roadmap(): RoadmapView {
  return {
    id: "r1",
    goal: { id: null, title: "Full-stack Engineer with applied AI" },
    planned: true,
    active: true,
    archivedAt: null,
    chapters: [
      {
        id: "react",
        title: "React",
        area: "Frontend",
        topics: [
          {
            id: "react.render_model",
            title: "State & rendering",
            custom: false,
            status: "learned",
            changedAt: "2026-10-15T01:41:36.642Z",
            learnedAt: "2026-10-15T01:41:36.642Z",
          },
          {
            id: "react.effects",
            title: "Effects",
            custom: false,
            status: "not_started",
            changedAt: null,
            learnedAt: null,
          },
        ],
      },
    ],
    counts: { learned: 1, skipped: 0, inProgress: 0, total: 2 },
    current: null,
    plans: { "react.effects": { prerequisites: [], related: [], minutes: 30, difficulty: null } },
  };
}

const sheet = {
  points: [{ pointId: "p1", question: "Q?", explanation: "E", example: "x", mistake: "M", ownMistake: true }],
  terms: [{ term: "Key", meaning: "Identity" }],
};

test("Engineering publishes chapters, statuses and reviews, never plans or point ids", () => {
  const engineering = portfolioEngineering({
    roadmaps: [roadmap()],
    reviews: new Map([["react.render_model", sheet]]),
    explanations: new Map(),
  });
  const [topic, other] = engineering.roadmaps[0].chapters[0].topics;
  assert.deepEqual(topic.review, {
    points: [{ question: "Q?", explanation: "E", example: "x", mistake: "M" }],
    terms: [{ term: "Key", meaning: "Identity" }],
  });
  assert.equal(topic.explanation, undefined, "explanations are off by default");
  assert.equal(other.review, null);
  const text = JSON.stringify(engineering);
  for (const secret of ["ownMistake", "pointId", "prerequisites", "r1"]) assert.ok(!text.includes(secret), secret);
  assert.deepEqual(engineering.roadmaps[0].counts, { learned: 1, inProgress: 0, total: 2 });
});

test("a switched-on explanation is published word for word", () => {
  const words = "1. becasue every server action is public\n2. revalidate";
  const engineering = portfolioEngineering({
    roadmaps: [roadmap()],
    reviews: new Map(),
    explanations: new Map([["react.render_model", words]]),
  });
  assert.equal(engineering.roadmaps[0].chapters[0].topics[0].explanation, words);
  const snapshot = buildSnapshot(fullProfile(), classic, hidden, 1, new Date(), engineering);
  assert.deepEqual(parsePortfolioSnapshot(JSON.parse(JSON.stringify(snapshot))), snapshot);
});
