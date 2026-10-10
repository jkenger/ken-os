import assert from "node:assert/strict";
import { test } from "node:test";
import {
  areaLevel, chapterStates, computeProgress, isoWeek, measuredHoursPerTopic, nextScreenQuestion, nextTopicQuestion, parseCareers, planRun, stageOne,
  roadmap, roleDistance, type AttemptRecord, type Label, type ChapterInfo, type Mode, type TopicProgress,
} from "@ken-os/domain";
import { careers, findTopic, runModes, topicMap } from "./curriculum";
import { pickDailyTopics } from "./daily";

// The career profile and the in-app baseline. Design: docs/architecture/engineering-lab-profile.md.

let counter = 0;
function answer(topicId: string, mode: Mode, label: Label, overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  counter += 1;
  return {
    id: `b${counter}`, topicId, kind: "baseline", mode, label, gradedBy: mode === "predict" ? "code" : "assessor", voided: false, selfRating: 3,
    misconceptions: [], solutionSeen: false, assessmentId: `set-${topicId}`, createdAt: new Date(Date.UTC(2026, 9, 4, 0, counter)),
    ...overrides,
  };
}

function progressFor(attempts: AttemptRecord[]): TopicProgress[] {
  return topicMap.topics.map((topic) => computeProgress(topic, attempts, false).progress);
}

// A chapter the owner added through the Guide: no written topics, so only placement checks can estimate it.
const payments: ChapterInfo = { id: "added-payments", title: "Payments", area: "backend" };

const placed = (ids: string[]) => ids.flatMap((id) => {
  const topic = findTopic(id)!;
  return runModes(topic).map((mode) => answer(id, mode, "solid"));
});

test("the roles file parses against the topic map and covers every area once", () => {
  assert.equal(careers.areas.length, 5);
  // Reopened by the rebuild (2026-10-10) until the owner re-approves the remap.
  assert.ok(careers.status !== "approved" || careers.approvedOn, "an approved file carries its approval date");
  assert.ok(careers.roles.some((role) => role.id === "fullstack-applied-ai"));
  assert.throws(() => parseCareers({ ...careers, areas: careers.areas.slice(1) }, topicMap), /exactly once/);
  const wrongArea = { ...careers, areas: careers.areas.map((area) => area.id === "frontend" ? { ...area, levels: { ...area.levels, junior: [{ chapter: "js-runtime", depth: "aware" }] } } : area) };
  assert.throws(() => parseCareers(wrongArea, topicMap), /belongs to foundations/);
});

test("every chapter has an area, and React and API boundaries are now separate chapters", () => {
  assert.ok(topicMap.chapters.every((module) => module.area));
  assert.equal(topicMap.chapters.find((module) => module.id === "react")?.area, "frontend");
  assert.equal(topicMap.chapters.find((module) => module.id === "api-boundaries")?.area, "backend");
});

test("a baseline answer counts like a placement: two solid answers place a topic", () => {
  const progress = progressFor(placed(["js.call_stack"])).find((item) => item.topicId === "js.call_stack")!;
  assert.equal(progress.placement, "passed");
  assert.equal(progress.baselineLabel, "solid");
});

test("a baseline label is solid only when every answer was", () => {
  const attempts = [answer("db.composite_indexes", "explain", "solid"), answer("db.composite_indexes", "explain", "partial")];
  const progress = progressFor(attempts).find((item) => item.topicId === "db.composite_indexes")!;
  assert.equal(progress.baselineLabel, "partial");
  assert.equal(progress.placement, "failed");
});

test("a later checkpoint sitting replaces the baseline's placement result", () => {
  const attempts = [
    answer("db.composite_indexes", "explain", "gap"),
    answer("db.composite_indexes", "explain", "solid", { kind: "checkpoint", assessmentId: "later" }),
    answer("db.composite_indexes", "explain", "solid", { kind: "checkpoint", assessmentId: "later" }),
  ];
  const progress = progressFor(attempts).find((item) => item.topicId === "db.composite_indexes")!;
  assert.equal(progress.placement, "passed");
  assert.equal(progress.baselineLabel, "gap", "the baseline label never moves");
});

test("the retired summary never proves or places anything", () => {
  const legacy = answer("db.transactions", "explain", "solid", { gradedBy: "baseline", assessmentId: null });
  const progress = progressFor([legacy]).find((item) => item.topicId === "db.transactions")!;
  assert.equal(progress.baselineLabel, "solid");
  assert.equal(progress.placement, null);
  assert.equal(progress.status, "NOT_STARTED");
});

test("the run asks a prediction first, confirms solid answers, probes partial ones and stops on gaps", () => {
  const modes: Mode[] = ["explain", "predict"];
  assert.equal(nextTopicQuestion(modes, []), 1, "a code-checked prediction comes first");
  assert.equal(nextTopicQuestion(modes, [{ itemIndex: 1, label: "solid", voided: false }]), 0, "solid gets a confirming question");
  assert.equal(nextTopicQuestion(modes, [{ itemIndex: 1, label: "rusty", voided: false }]), 0, "rusty gets a probing question");
  assert.equal(nextTopicQuestion(modes, [{ itemIndex: 1, label: "misconception", voided: false }]), null, "a misconception stops the topic");
  assert.equal(nextTopicQuestion(modes, [{ itemIndex: 1, label: "solid", voided: false }, { itemIndex: 0, label: "solid", voided: false }]), null, "two answers is the most");
  assert.equal(nextTopicQuestion(["predict", "explain", "explain"], [{ itemIndex: 0, label: "solid", voided: true }]), 1, "a thrown-out question is replaced");
});

test("topics with one question type get the same type twice, never a lab's mode", () => {
  const topic = findTopic("db.transactions")!;
  assert.deepEqual(runModes(topic), ["explain", "explain"]);
  assert.ok(!runModes(topic).includes("implement"));
});

test("screening asks its two questions in order", () => {
  assert.equal(nextScreenQuestion([]), 0);
  assert.equal(nextScreenQuestion([0]), 1);
  assert.equal(nextScreenQuestion([0, 1]), null);
});

test("planning a run skips known topics and screens unwritten chapters", () => {
  const plan = planRun(topicMap, progressFor(placed(["js.call_stack"])), [payments]);
  const runtime = plan.chapters.find((chapter) => chapter.chapterId === "js-runtime");
  assert.ok(runtime?.kind === "topics" && runtime.skipped.includes("js.call_stack") && !runtime.topicIds.includes("js.call_stack"));
  assert.equal(plan.chapters.find((chapter) => chapter.chapterId === "added-payments")?.kind, "screen", "an added chapter gets a placement check");
  const unwritten = topicMap.chapters.filter((module) => !topicMap.topics.some((topic) => topic.chapter === module.id)).length;
  assert.equal(plan.chapters.filter((chapter) => chapter.kind === "screen").length, unwritten + 1, "every chapter without written topics gets a placement check");
  assert.equal(plan.chapters.find((chapter) => chapter.chapterId === "api-boundaries")?.kind, "topics", "API boundaries now has written topics");
});

test("chapter depth: build needs the working topics known, run needs all; screening tops out at build", () => {
  const db = topicMap.topics.filter((topic) => topic.chapter === "databases");
  const working = db.filter((topic) => topic.depth === "working").map((topic) => topic.id);
  const states = chapterStates(topicMap, progressFor(placed(working)), [{ chapterId: "added-payments", labels: ["solid", "solid"] }], [payments]);
  assert.equal(states.find((state) => state.chapterId === "databases")?.depth, "build");
  assert.equal(states.find((state) => state.chapterId === "added-payments")?.depth, "build");
  assert.equal(states.find((state) => state.chapterId === "added-payments")?.estimate, true);
  const weak = chapterStates(topicMap, progressFor([]), [{ chapterId: "added-payments", labels: ["partial", "gap"] }], [payments]);
  assert.equal(weak.find((state) => state.chapterId === "added-payments")?.depth, "none");
  const screenedWritten = chapterStates(topicMap, progressFor([]), [{ chapterId: "databases", labels: ["solid", "solid"] }]);
  // Assessment v2 (A2): a written chapter cleared in stage 1 counts as "can build it", as an estimate, never as proven.
  assert.equal(screenedWritten.find((state) => state.chapterId === "databases")?.depth, "build");
  assert.equal(screenedWritten.find((state) => state.chapterId === "databases")?.estimate, true);
  const all = chapterStates(topicMap, progressFor(placed(db.map((topic) => topic.id))), []);
  assert.equal(all.find((state) => state.chapterId === "databases")?.depth, "run");
});

test("levels are per area, need every chapter of the level, and say how far the next step is", () => {
  const foundations = careers.areas.find((area) => area.id === "foundations")!;
  const none = areaLevel(foundations, chapterStates(topicMap, progressFor([]), []));
  assert.equal(none.level, null);
  assert.equal(none.next?.level, "junior");
  const m1 = topicMap.topics.filter((topic) => topic.chapter === "js-runtime" && topic.depth === "working").map((topic) => topic.id);
  const junior = areaLevel(foundations, chapterStates(topicMap, progressFor([...placed(m1), ...placed(["web.cookies_cors"]).slice(0, 1).map((item) => ({ ...item, label: "partial" as Label }))]), []));
  assert.equal(junior.level, "junior", "m1 at build and m2 at aware");
  assert.equal(junior.next?.level, "mid");
  assert.ok(junior.next!.total >= 2 && junior.next!.met < junior.next!.total);
});

test("a level resting on screening answers is marked as an estimate", () => {
  // A ladder whose junior step is the added chapter and whose mid step is a written chapter nobody has proven.
  const ladder = { id: "backend" as const, title: "Backend", summary: "", levels: {
    junior: [{ chapter: "added-payments", depth: "build" as const }],
    mid: [{ chapter: "databases", depth: "build" as const }],
    senior: [],
  } };
  const level = areaLevel(ladder, chapterStates(topicMap, progressFor([]), [{ chapterId: "added-payments", labels: ["solid", "solid"] }], [payments]));
  assert.equal(level.level, "junior");
  assert.equal(level.estimate, true);
  assert.equal(level.next?.level, "mid");
});

test("a role's overall level is capped by its weakest area", () => {
  const role = careers.roles.find((item) => item.id === "fullstack-applied-ai")!;
  const distance = roleDistance(role, careers, chapterStates(topicMap, progressFor([]), []));
  assert.equal(distance.overall, null);
  assert.ok(distance.missing.length > 0);
  assert.ok(distance.missing.some((item) => item.area === "ai"));
});

test("the roadmap puts what the lowest level needs first, foundations before what builds on them", () => {
  const role = careers.roles.find((item) => item.id === "fullstack-applied-ai")!;
  const progress = progressFor([]);
  const steps = roadmap(role, careers, chapterStates(topicMap, progress, []), topicMap, progress, 5);
  assert.equal(steps[0].forLevel, "junior");
  assert.equal(steps[0].area, "foundations");
  const levels = steps.map((step) => ["junior", "mid", "senior"].indexOf(step.forLevel));
  assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
  assert.ok(steps.every((step, index) => index === 0 || step.doneByWeek >= steps[index - 1].doneByWeek));
});

test("a chapter needed deeper by a higher level shows up again as its own stage", () => {
  const role = careers.roles.find((item) => item.id === "fullstack-applied-ai")!;
  const progress = progressFor([]);
  const steps = roadmap(role, careers, chapterStates(topicMap, progress, []), topicMap, progress, 5);
  const runtime = steps.filter((step) => step.chapter === "js-runtime");
  assert.deepEqual(runtime.map((step) => [step.need, step.forLevel]), [["build", "junior"], ["run", "mid"]]);
  assert.equal(runtime[1].have, "build", "the deeper stage starts where the first one ends");
  assert.ok(runtime[1].hours < runtime[0].hours, "the deeper stage only counts the deep topics");
});

test("pace comes from history only after three proven topics", () => {
  const span = { firstAt: "2026-10-01T00:00:00Z", provenAt: "2026-10-08T00:00:00Z" };
  assert.equal(measuredHoursPerTopic([span, span], 7), null);
  assert.equal(measuredHoursPerTopic([span, span, span], 7), 7);
});

test("daily practice draws on due and proven topics, or warms up before anything is proven", () => {
  const base = progressFor([]);
  const warm = pickDailyTopics(base.map((item) => item.topicId === "js.promises" ? { ...item, status: "LEARNING" } : item), new Date());
  assert.deepEqual(warm, { topicIds: ["js.promises"], warmUp: true });
  const due = base.map((item) => item.topicId === "js.call_stack" ? { ...item, status: "VALIDATED" as const, nextReviewAt: "2026-10-01T00:00:00Z", lastAttemptAt: "2026-09-20T00:00:00Z" } : item);
  const set = pickDailyTopics(due, new Date("2026-10-05T00:00:00Z"));
  assert.equal(set.warmUp, false);
  assert.equal(set.topicIds[0], "js.call_stack");
});

test("radar weeks follow ISO weeks", () => {
  assert.equal(isoWeek(new Date("2026-10-03T12:00:00Z")), "2026-W40");
  assert.equal(isoWeek(new Date("2027-01-01T12:00:00Z")), "2026-W53");
});

test("two-stage runs: written chapters ask two chapter questions first", () => {
  const plan = planRun(topicMap, progressFor([]));
  const written = plan.chapters.filter((chapter) => chapter.kind === "topics");
  assert.ok(written.length > 0);
  assert.ok(written.every((chapter) => chapter.kind === "topics" && chapter.screenFirst === (chapter.topicIds.length > 0)));
});

test("stage 1: both solid clears the chapter, anything else digs into topics", () => {
  assert.equal(stageOne([]), "pending");
  assert.equal(stageOne(["solid"]), "pending");
  assert.equal(stageOne(["solid", "solid"]), "cleared");
  assert.equal(stageOne(["solid", "partial"]), "drill");
  assert.equal(stageOne(["gap", "solid"]), "drill");
});

test("a cleared chapter counts as can-build-it, as an estimate, and proves no topic", () => {
  const progress = progressFor([]);
  const states = chapterStates(topicMap, progress, [{ chapterId: "js-runtime", labels: ["solid", "solid"] }]);
  const runtime = states.find((state) => state.chapterId === "js-runtime")!;
  assert.equal(runtime.depth, "build");
  assert.equal(runtime.estimate, true);
  assert.equal(runtime.known, 0, "chapter questions never make a topic known");
  const notCleared = chapterStates(topicMap, progress, [{ chapterId: "js-runtime", labels: ["solid", "partial"] }]).find((state) => state.chapterId === "js-runtime")!;
  assert.equal(notCleared.depth, "none");
  // Placed topics already at "can run it" are never lowered by stage-1 answers.
  const placedAll = progressFor(placed(topicMap.topics.filter((topic) => topic.chapter === "js-runtime").map((topic) => topic.id)));
  const run = chapterStates(topicMap, placedAll, [{ chapterId: "js-runtime", labels: ["solid", "solid"] }]).find((state) => state.chapterId === "js-runtime")!;
  assert.equal(run.depth, "run");
  assert.equal(run.estimate, false);
});
