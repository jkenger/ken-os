// Light, dark, or follow the system. The choice is kept in this browser's localStorage (no account setting), and the
// pre-paint script in the root layout applies it before the first paint so the page never flashes the other theme.
// Added 28 Oct 2026 with the account menu in the top bar.

export const THEME_KEY = "keos-theme";

export const themeChoices = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof themeChoices)[number];

/** A stored value back to a choice. Anything missing or unknown follows the system. */
export function readThemeChoice(stored: string | null): ThemeChoice {
  return themeChoices.find((choice) => choice === stored) ?? "system";
}

export function isDark(choice: ThemeChoice, systemDark: boolean): boolean {
  return choice === "dark" || (choice === "system" && systemDark);
}

/** Runs in <head> before the first paint, then keeps following the system setting (and other tabs' choices) while
 *  the page is open. It repeats readThemeChoice and isDark in plain ES5 because it runs before any bundle loads. */
export const themeScript = `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(){var c=null;try{c=window.localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}document.documentElement.classList.toggle("dark",c==="dark"||(c!=="light"&&m.matches))};a();m.addEventListener("change",a);window.addEventListener("storage",a)}catch(e){}})()`;
