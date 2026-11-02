import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeDescriptionHtml } from "./sanitize-description";

test("keeps ordinary formatting: paragraphs, bold, lists, links", () => {
  const input = "<p>We need a <strong>senior</strong> engineer.</p><ul><li>5+ years</li></ul>";
  const result = sanitizeDescriptionHtml(input);
  assert.ok(result);
  assert.ok(result.includes("<p>"));
  assert.ok(result.includes("<strong>"));
  assert.ok(result.includes("<li>"));
});

test("strips script tags entirely, the posting's own text survives", () => {
  const result = sanitizeDescriptionHtml('<p>Join us</p><script>alert("x")</script>');
  assert.ok(result);
  assert.ok(!result.includes("<script"));
  assert.ok(!result.includes("alert"));
  assert.ok(result.includes("Join us"));
});

test("strips inline event handler attributes", () => {
  const result = sanitizeDescriptionHtml('<p onclick="steal()">Click</p>');
  assert.ok(result);
  assert.ok(!result.includes("onclick"));
  assert.ok(!result.includes("steal"));
});

test("strips a javascript: link href", () => {
  const result = sanitizeDescriptionHtml('<a href="javascript:alert(1)">link</a>');
  assert.ok(result);
  assert.ok(!result.includes("javascript:"));
});

test("null input returns null, never thrown", () => {
  assert.equal(sanitizeDescriptionHtml(null), null);
});
