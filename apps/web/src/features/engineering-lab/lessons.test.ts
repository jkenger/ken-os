import assert from "node:assert/strict";
import { test } from "node:test";
import { finalizeLesson, parseAuthoredTopic, type LessonDraft } from "@ken-os/domain";
import { authoredTopics, exerciseFor, findTopic } from "./curriculum";
import { labSolutions } from "./generated/lab-solutions.generated";

// The lesson format and the hand-written Retry & backoff topic (docs/architecture/engineering-rebuild.md, section 4).

const url = "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide";
const draft: LessonDraft = {
  heading: "Microtasks run before the next task",
  body: "Promise callbacks wait for the current code to finish. Then every queued microtask runs.",
  mentalModel: "Finish the stack, drain microtasks, then take one task.",
  block: {
    kind: "code",
    content: "console.log(1);\nPromise.resolve().then(() => console.log(2));\n",
    note: "Prints 1, then 2.",
  },
  example: "A spinner set in a promise callback appears after the current handler returns.",
  deeper: { title: "Starving tasks", body: "A microtask that queues another one keeps timers waiting." },
  prove: ["Predict microtask order", "Explain run to completion", "Spot a starved timer"],
  citations: [
    { claim: "Microtasks run after the current task", sourceUrl: url },
    { claim: "Made up", sourceUrl: "https://example.com/x" },
  ],
};
const packet = {
  sources: [
    {
      title: "Microtask guide",
      url,
      tier: "official_docs" as const,
      retrievedAt: "2026-10-10",
      whyItMatters: "Defines the queue",
    },
  ],
};
const meta = { topicId: "js.event_loop", version: 1, sourcePacketId: "p1", promptVersion: "tutor-v5", model: "test" };

test("a lesson keeps only sources from its packet and flags the rest", () => {
  const lesson = finalizeLesson(draft, packet, meta);
  assert.deepEqual(lesson.sources, [{ title: "Microtask guide", url }]);
  assert.deepEqual(lesson.rejected, ["Citation outside the source packet: https://example.com/x"]);
  assert.equal(lesson.prove.length, 3);
  assert.equal(lesson.block.content, "console.log(1);\nPromise.resolve().then(() => console.log(2));");
});

test("a lesson needs a real source, exactly 3 things to prove and every part", () => {
  assert.throws(
    () => finalizeLesson({ ...draft, citations: [{ claim: "x", sourceUrl: "https://example.com" }] }, packet, meta),
    /cited none/,
  );
  assert.throws(() => finalizeLesson({ ...draft, prove: ["One", "Two"] }, packet, meta), /exactly 3/);
  assert.throws(() => finalizeLesson({ ...draft, example: "  " }, packet, meta), /missing a part/);
  assert.equal(finalizeLesson({ ...draft, deeper: null }, packet, meta).deeper, null, "Go deeper is optional");
});

test("Retry & backoff is hand-written to the spec", () => {
  const topic = authoredTopics["rel.retry_backoff"];
  assert.ok(topic, "the reference topic ships with its lesson");
  assert.equal(topic.lesson.heading, "A timeout is an uncertain outcome");
  assert.equal(topic.lesson.block.content, "delay = min(1000 × 2 ** attempt, 30000)");
  assert.equal(topic.lesson.prove.length, 3);
  assert.equal(
    topic.lesson.sources[0].url,
    "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/",
  );
  assert.equal(topic.proof.rubric.length, 3, "key or check first, bounded doubling waits, a random part");
  assert.match(topic.proof.prompt, /The payment timed out\. What now\?/);
  const lab = exerciseFor(findTopic("rel.retry_backoff")!);
  assert.equal(lab.id, "retry-policy");
  assert.equal(lab.starter.trim(), "function retryDelay(attempt) {\n  return 1000;\n}");
  assert.match(labSolutions["retry-policy"], /Math\.min\(1000 \* 2 \*\* attempt, 30000\)/);
  assert.equal((lab.tests.match(/^test\(/gm) ?? []).length, 4, "4 tests: attempts 0, 1, 2 and 8");
});

test("hand-written topic files are checked", () => {
  const raw = {
    topicId: "rel.retry_backoff",
    checkedOn: "2026-10-10",
    lesson: { ...authoredTopics["rel.retry_backoff"].lesson },
    proof: authoredTopics["rel.retry_backoff"].proof,
  };
  assert.doesNotThrow(() => parseAuthoredTopic(raw, "x.yaml"));
  assert.throws(
    () => parseAuthoredTopic({ ...raw, lesson: { ...raw.lesson, prove: ["Only one"] } }, "x.yaml"),
    /exactly 3/,
  );
  assert.throws(
    () =>
      parseAuthoredTopic(
        { ...raw, lesson: { ...raw.lesson, sources: [{ title: "Plain", url: "http://example.com" }] } },
        "x.yaml",
      ),
    /https/,
  );
  assert.throws(
    () =>
      parseAuthoredTopic(
        { ...raw, lesson: { ...raw.lesson, block: { ...raw.lesson.block, kind: "table" } } },
        "x.yaml",
      ),
    /block.kind/,
  );
});
