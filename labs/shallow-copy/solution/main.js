// Spread copies one level. copy.display still pointed at the same object as settings.display, so writing
// through it changed the original. Copy each level you change.
function withTheme(settings, theme) {
  return { ...settings, display: { ...settings.display, theme } };
}

function addTag(post, tag) {
  return { ...post, tags: [...post.tags, tag] };
}
