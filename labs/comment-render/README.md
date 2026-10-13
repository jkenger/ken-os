`renderComment(comment)` returns the HTML for one comment on a public page. Everything in `comment` was typed by a
stranger: `author`, `text`, and an optional `website` link.

The HTML it should return:

```html
<article class="comment">
  <a href="https://example.com" rel="nofollow noopener noreferrer">Ana</a>
  <p>Nice post</p>
</article>
```

When there's no usable website, the author is plain text instead of a link: `<span>Ana</span>`.

The starter pastes the strings straight into the template, so a comment like `<img src=x onerror=...>` runs code in
every reader's browser. Fix it:

- Escape every piece of text you put into HTML: `&`, `<`, `>`, `"` and `'`.
- Only link to `http:` and `https:` addresses. A `javascript:` link runs code when clicked; show the author as plain
  text instead.
- Keep the attribute values in double quotes, escaped too.

Then explain why React's `{comment.text}` is safe by default, what `dangerouslySetInnerHTML` changes, and where a
Content Security Policy fits in as a second line of defence.
