// Cross-site scripting happens when text from one user is treated as code in another user's browser. The fix is to
// encode on output, for the context you're writing into: in HTML text and in double-quoted attributes, escape
// & < > " and ' (ampersand first, so the others aren't escaped twice). Escaping doesn't make a URL safe, though: a
// "javascript:" link is valid text that runs code when clicked, so allow only http and https. React does the escaping
// for {text} automatically; dangerouslySetInnerHTML turns it off. A Content Security Policy is a second line of
// defence that stops inline scripts from running even if one slips through.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value) {
  if (typeof value !== "string") return null;
  const url = value.trim();
  // Check the scheme, not the text: only addresses that start with http:// or https:// may become links.
  return /^https?:\/\//i.test(url) ? url : null;
}

function renderComment(comment) {
  const name = escapeHtml(comment.author);
  const href = safeUrl(comment.website);
  const author = href
    ? `<a href="${escapeHtml(href)}" rel="nofollow noopener noreferrer">${name}</a>`
    : `<span>${name}</span>`;
  return `<article class="comment">${author}<p>${escapeHtml(comment.text)}</p></article>`;
}
