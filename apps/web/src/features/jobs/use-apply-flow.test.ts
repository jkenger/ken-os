import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldShowApplyDialog } from "./use-apply-flow";

test("no window was ever opened: neither closing nor refocusing means anything", () => {
  assert.equal(shouldShowApplyDialog({ windowClosed: false, justRegainedFocus: true, hasPendingWindow: false }), false);
  assert.equal(shouldShowApplyDialog({ windowClosed: true, justRegainedFocus: false, hasPendingWindow: false }), false);
});

test("the tracked tab closing shows the dialog", () => {
  assert.equal(shouldShowApplyDialog({ windowClosed: true, justRegainedFocus: false, hasPendingWindow: true }), true);
});

test("this window regaining focus after a tracked tab opened shows the dialog", () => {
  assert.equal(shouldShowApplyDialog({ windowClosed: false, justRegainedFocus: true, hasPendingWindow: true }), true);
});

test("an unrelated tab switch (no pending window) never shows the dialog, even on refocus", () => {
  assert.equal(shouldShowApplyDialog({ windowClosed: false, justRegainedFocus: true, hasPendingWindow: false }), false);
});

test("neither signal firing shows nothing", () => {
  assert.equal(shouldShowApplyDialog({ windowClosed: false, justRegainedFocus: false, hasPendingWindow: true }), false);
});
