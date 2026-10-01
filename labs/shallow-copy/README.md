Both functions are meant to return an updated copy and leave their input untouched. Both change the input.

- `withTheme(settings, theme)` returns the settings with `display.theme` replaced.
- `addTag(post, tag)` returns the post with `tag` added to `tags`.

Fix them so the original objects never change. Don't use `structuredClone` on the whole object; copy only
what you change. Then explain why `{ ...settings }` wasn't enough.
