function renderComment(comment) {
  const author = comment.website
    ? `<a href="${comment.website}" rel="nofollow noopener noreferrer">${comment.author}</a>`
    : `<span>${comment.author}</span>`;
  return `<article class="comment">${author}<p>${comment.text}</p></article>`;
}
