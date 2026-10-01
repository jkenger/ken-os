function withTheme(settings, theme) {
  const copy = { ...settings };
  copy.display.theme = theme;
  return copy;
}

function addTag(post, tag) {
  post.tags.push(tag);
  return post;
}
