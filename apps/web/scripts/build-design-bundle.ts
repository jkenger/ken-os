import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, type Plugin } from "esbuild";
import postcss, { type AcceptedPlugin } from "postcss";
import tailwind from "@tailwindcss/postcss";

// Builds the files the Ken OS design system in Claude runs its live previews with, into design-system/dist:
//   components/lib/react.js, components/lib/react-dom.js  React 19 as classic scripts (window.React, window.ReactDOM)
//   components/bundle.js                                  the app's components as window.KenOS
//   components/bundle.css                                 the Tailwind CSS those components need
// The stylesheet carries the app's own shadcn preset variables. Previews run outside Next, so next/font never loads
// the preset's fonts there; the bundle CSS links them from Google Fonts instead, for the previews only (the app itself
// never does). Keep the font names in step with layout.tsx.
// Publishing the files is done from a Claude session (see the design-system-sync skill).

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(webRoot, "design-system/dist/components");
mkdirSync(resolve(out, "lib"), { recursive: true });

const production = { "process.env.NODE_ENV": '"production"' };

/** Points bare imports of React at the globals the design system's frame loads first. */
const globals = (map: Record<string, string>): Plugin => ({
  name: "globals",
  setup(context) {
    const filter = new RegExp(
      `^(${Object.keys(map)
        .map((name) => name.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&"))
        .join("|")})$`,
    );
    context.onResolve({ filter }, (args) => ({ path: args.path, namespace: "globals" }));
    context.onLoad({ filter: /.*/, namespace: "globals" }, (args) => ({
      contents: `module.exports = ${map[args.path]};`,
      loader: "js",
    }));
  },
});

/** next/link outside Next: a plain anchor with the same props. */
const nextLink: Plugin = {
  name: "next-link",
  setup(context) {
    context.onResolve({ filter: /^next\/link$/ }, () => ({ path: "next-link", namespace: "shim" }));
    context.onLoad({ filter: /.*/, namespace: "shim" }, () => ({
      loader: "js",
      contents: `import { createElement, forwardRef } from "react";
export default forwardRef(function Link({ href, prefetch, replace, scroll, shallow, ...props }, ref) {
  return createElement("a", { ref, href: typeof href === "string" ? href : (href && href.pathname) || "#", ...props });
});`,
    }));
  },
};

async function script(file: string, options: Parameters<typeof build>[0]) {
  const result = await build({
    bundle: true,
    minify: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    define: production,
    legalComments: "none",
    write: false,
    ...options,
  });
  if (!result.outputFiles?.length) throw new Error(`esbuild wrote nothing for ${file}`);
  let text = result.outputFiles[0].text;
  // Consumers inline these files in a <script>; neither sequence may appear in them.
  text = text.replaceAll("</script", "<\\/script").replaceAll("<!--", "<\\!--");
  writeFileSync(resolve(out, file), text);
  return text.length;
}

async function main() {
  const sizes: Record<string, number> = {};
  sizes["lib/react.js"] = await script("lib/react.js", {
    stdin: { contents: `import * as React from "react"; window.React = React;`, resolveDir: webRoot, loader: "js" },
  });
  sizes["lib/react-dom.js"] = await script("lib/react-dom.js", {
    stdin: {
      contents: `import * as ReactDOM from "react-dom"; import * as Client from "react-dom/client"; window.ReactDOM = Object.assign({}, ReactDOM, Client);`,
      resolveDir: webRoot,
      loader: "js",
    },
    plugins: [globals({ react: "window.React" })],
  });

  const cards = ["Button", "Badge", "Pill", "Input", "PageHeading", "Rail", "Coverage", "Notice"];
  const header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: "KenOS", components: cards.map((name) => ({ name })) })} */\n`;
  sizes["bundle.js"] = await script("bundle.js", {
    entryPoints: [resolve(webRoot, "design-system/components.ts")],
    globalName: "KenOS",
    jsx: "automatic",
    tsconfig: resolve(webRoot, "tsconfig.json"),
    banner: { js: header.trimEnd() },
    plugins: [
      globals({ react: "window.React", "react-dom": "window.ReactDOM", "react-dom/client": "window.ReactDOM" }),
      nextLink,
    ],
  });

  // The app's stylesheet, scanning only what the bundle contains, with the fonts set the way next/font would set them.
  const globalsPath = resolve(webRoot, "src/app/globals.css");
  const source = readFileSync(globalsPath, "utf8")
    // Loots has one light theme. The design system page adds a "dark" class to its preview frames when the viewer
    // uses dark mode, which would switch on shadcn's built-in dark styles; point the variant at a class nothing sets.
    .replace("@custom-variant dark (&:is(.dark *));", "@custom-variant dark (&:is(.ken-os-dark-theme *));")
    .concat("\nhtml { color-scheme: light !important; }\n")
    .concat(
      `\n:root { --font-sans: "Public Sans", ui-sans-serif, system-ui, sans-serif; --font-heading: "Source Serif 4", ui-serif, Georgia, serif; --font-mono: "Geist Mono", ui-monospace, monospace; }\nhtml { font-family: var(--font-sans); }\n`,
    )
    .replace(
      `@import "tailwindcss";`,
      `@import "tailwindcss" source(none);\n@source "../components/ui";\n@source "../components/engineering/kit.tsx";\n@source "../components/workspace-shell.tsx";`,
    );
  const plugin = tailwind({ optimize: { minify: true } }) as AcceptedPlugin;
  const css = await postcss([plugin]).process(source, { from: globalsPath });
  // The font link must be the first rule: an @import after any other rule is ignored.
  const fonts = `@import url("https://fonts.googleapis.com/css2?family=Public+Sans:wght@100..900&family=Source+Serif+4:opsz,wght@8..60,200..900&family=Geist+Mono:wght@100..900&display=swap");\n`;
  writeFileSync(resolve(out, "bundle.css"), fonts + css.css);
  sizes["bundle.css"] = fonts.length + css.css.length;

  for (const [file, size] of Object.entries(sizes)) console.log(`${file.padEnd(18)} ${(size / 1024).toFixed(1)} KB`);
}

void main();
