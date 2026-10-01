test("withTheme leaves the original settings alone", () => {
  const settings = { language: "en", display: { theme: "light", fontSize: 14 } };
  const updated = withTheme(settings, "dark");
  assert.equal(updated.display.theme, "dark");
  assert.equal(updated.display.fontSize, 14);
  assert.equal(settings.display.theme, "light");
  assert.ok(updated.display !== settings.display, "the nested display object must be a new object");
});

test("addTag returns a new post and keeps the old tags", () => {
  const post = { title: "Hello", tags: ["intro"] };
  const updated = addTag(post, "news");
  assert.deepEqual(updated.tags, ["intro", "news"]);
  assert.deepEqual(post.tags, ["intro"]);
  assert.ok(updated !== post, "addTag must return a new post object");
});
