import assert from "node:assert/strict";
import { test } from "node:test";
import { finalizeLesson, type LessonDraft } from "@ken-os/domain";

const url = "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide";
const draft: LessonDraft = {
  sections: { whyItMatters: "a", whatYouKnow: "b", theGap: "c", theory: "d", mentalModel: "e", workedExample: { code: "console.log(1)", walkthrough: "f" } },
  practice: [],
  citations: [{ claim: "Microtasks drain first.", sourceUrl: url }],
  noteSuggestions: [],
};
const meta = { topicId: "js.event_loop", version: 1, sourcePacketId: "p", promptVersion: "tutor-v3", model: "m", labIds: [] };

test("Go deeper keeps up to four non-empty sections", () => {
  const deeper = Array.from({ length: 6 }, (_, index) => ({ title: `Extra ${index}`, body: "Some depth." }));
  const lesson = finalizeLesson({ ...draft, deeper: [{ title: " ", body: "empty title" }, ...deeper] }, { sources: [{ url } as never] }, meta);
  assert.deepEqual(lesson.deeper?.map((item) => item.title), ["Extra 0", "Extra 1", "Extra 2", "Extra 3"]);
});

test("lessons written before tutor-v3 have no Go deeper sections and still work", () => {
  const lesson = finalizeLesson(draft, { sources: [{ url } as never] }, { ...meta, promptVersion: "tutor-v2" });
  assert.deepEqual(lesson.deeper, []);
});
