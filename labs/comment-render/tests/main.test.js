test("a plain comment renders as expected", () => {
  assert.equal(
    renderComment({ author: "Ana", text: "Nice post", website: "https://example.com" }),
    '<article class="comment"><a href="https://example.com" rel="nofollow noopener noreferrer">Ana</a><p>Nice post</p></article>',
  );
  assert.equal(renderComment({ author: "Ana", text: "Hi" }), '<article class="comment"><span>Ana</span><p>Hi</p></article>');
});

test("markup in the text is shown, not run", () => {
  const html = renderComment({ author: "Ana", text: '<img src=x onerror="alert(1)"><script>steal()</script>' });
  assert.ok(!html.includes("<img"), "an <img> tag from the text must not reach the page");
  assert.ok(!html.includes("<script"), "a <script> tag from the text must not reach the page");
  assert.ok(html.includes("&lt;script&gt;steal()&lt;/script&gt;"), "the text should still be visible, escaped");
});

test("every special character is escaped, ampersand first", () => {
  const html = renderComment({ author: "Tom & Jerry", text: `5 > 3 & "quotes" and 'single'` });
  assert.ok(html.includes("<span>Tom &amp; Jerry</span>"));
  assert.ok(html.includes("<p>5 &gt; 3 &amp; &quot;quotes&quot; and &#39;single&#39;</p>"));
  assert.ok(!html.includes("&amp;amp;"), "escape each character once");
});

test("an author name can't break out of the link", () => {
  const html = renderComment({ author: '"><script>x()</script>', text: "hi", website: "https://example.com" });
  assert.ok(!html.includes("<script"), "the author's name must be escaped inside the link too");
});

test("a website can't break out of its attribute", () => {
  const html = renderComment({ author: "Ana", text: "hi", website: 'https://example.com" onmouseover="steal()' });
  assert.ok(!/onmouseover="/.test(html), "a quote in the address must not end the href attribute");
});

test("only http and https addresses become links", () => {
  for (const website of ["javascript:alert(1)", " JavaScript:alert(1)", "data:text/html,<script>x()</script>", "vbscript:x"]) {
    const html = renderComment({ author: "Ana", text: "hi", website });
    assert.ok(!html.includes("<a "), `${website} must not become a link`);
    assert.ok(html.includes("<span>Ana</span>"));
  }
  assert.ok(renderComment({ author: "Ana", text: "hi", website: "http://example.com" }).includes('href="http://example.com"'));
});
