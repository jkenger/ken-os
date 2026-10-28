import assert from "node:assert/strict";
import { test } from "node:test";
import { isDark, readThemeChoice, THEME_KEY, themeScript } from "./theme";

test("a missing or unknown stored choice means follow the system", () => {
  assert.equal(readThemeChoice(null), "system");
  assert.equal(readThemeChoice("purple"), "system");
  assert.equal(readThemeChoice("light"), "light");
  assert.equal(readThemeChoice("dark"), "dark");
});

test("light and dark win over the system setting; system follows it", () => {
  assert.equal(isDark("light", true), false);
  assert.equal(isDark("dark", false), true);
  assert.equal(isDark("system", true), true);
  assert.equal(isDark("system", false), false);
});

/** Runs the pre-paint script against a stand-in browser and reports whether <html> ended up dark. */
function runScript({ stored, systemDark }: { stored: string | null; systemDark: boolean }) {
  const classes = new Set<string>();
  const listeners: Record<string, () => void> = {};
  const media = { matches: systemDark, addEventListener: (_: string, fn: () => void) => (listeners.media = fn) };
  const window = {
    matchMedia: () => media,
    localStorage: { getItem: (key: string) => (key === THEME_KEY ? stored : null) },
    addEventListener: (type: string, fn: () => void) => (listeners[type] = fn),
  };
  const document = {
    documentElement: {
      classList: { toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)) },
    },
  };
  new Function("window", "document", themeScript)(window, document);
  return {
    dark: () => classes.has("dark"),
    systemChanges: (dark: boolean) => {
      media.matches = dark;
      listeners.media?.();
    },
  };
}

test("before the first paint, the stored choice decides the theme", () => {
  assert.equal(runScript({ stored: "light", systemDark: true }).dark(), false);
  assert.equal(runScript({ stored: "dark", systemDark: false }).dark(), true);
  assert.equal(runScript({ stored: null, systemDark: true }).dark(), true);
});

test("a system change moves the page only while the choice is system", () => {
  const following = runScript({ stored: null, systemDark: false });
  following.systemChanges(true);
  assert.equal(following.dark(), true);

  const pinned = runScript({ stored: "light", systemDark: false });
  pinned.systemChanges(true);
  assert.equal(pinned.dark(), false);
});
